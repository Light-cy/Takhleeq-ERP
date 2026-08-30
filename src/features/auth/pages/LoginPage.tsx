import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../../types';
import { authApi } from '../services/auth.api';

interface LoginPageProps {
  isStaff?: boolean;
  onNavigate: (path: string) => void;
  onLoginSuccess: (token: string, user: User) => void;
  simulatedUsers?: User[];
}

export function LoginPage({ isStaff = false, onNavigate, onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Login tab state: 'founder' or 'microsoft'
  const [loginMode, setLoginMode] = useState<'founder' | 'microsoft'>('founder');
  const [founderEmail, setFounderEmail] = useState('');
  const [founderPassword, setFounderPassword] = useState('');

  const handleFounderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!founderEmail || !founderPassword) {
      setErrorMessage('Please enter both your email address and enrollment password.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await authApi.loginSimulated(founderEmail.trim(), founderPassword.trim());
      onLoginSuccess(data.token, data.user);

      if (data.user.role === 'Cohort Founder' || loginMode === 'founder') {
        onNavigate('/founder-dashboard');
      } else if (data.user.role === 'UCP Member') {
        if (isStaff) {
          setErrorMessage('Access Denied: This UCP Member account does not have Back-office ERP staff clearance.');
          setLoading(false);
        } else {
          onNavigate('/booking');
        }
      } else {
        onNavigate('/staff/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed: Please check your email and password.');
      setLoading(false);
    }
  };

  // Real Microsoft SSO OAuth 2.0 Popup Flow
  const handleRealMicrosoftLogin = () => {
    setErrorMessage(null);
    setLoading(true);

    const clientId = (import.meta as any).env?.VITE_MICROSOFT_CLIENT_ID || (import.meta as any).env?.AZURE_CLIENT_ID;
    if (!clientId) {
      setErrorMessage('Microsoft Azure Client ID is not configured in environment variables. Please sign in with your Admin / Staff Email and Password.');
      setLoading(false);
      return;
    }

    const redirectUri = encodeURIComponent(window.location.origin + '/microsoft-callback.html');
    const scope = encodeURIComponent('openid email profile User.Read');
    const responseType = 'token'; // implicit grant flow to obtain token on frontend
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${redirectUri}&scope=${scope}&response_mode=fragment&prompt=select_account`;

    // Calculate center positioning for popup
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'MicrosoftLoginPopup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=no,resizable=yes`
    );

    if (!popup) {
      setErrorMessage('Popup Blocked: Please enable popups for this site to sign in using your real Microsoft account.');
      setLoading(false);
      return;
    }

    // Set up message event listener to receive access token from callback window
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data && event.data.type === 'MS_SSO_SUCCESS') {
        window.removeEventListener('message', handleMessage);
        const tokenVal = event.data.accessToken;
        
        try {
          // Exchange real access token for system JWT on backend using authApi
          const data = await authApi.loginMicrosoft(tokenVal);

          // Successful authentication
          onLoginSuccess(data.token, data.user);
          
          if (data.user.role === 'Cohort Founder') {
            onNavigate('/founder-dashboard');
          } else if (data.user.role === 'UCP Member') {
            if (isStaff) {
              setErrorMessage('Access Denied: This UCP Member account does not have Back-office ERP staff clearance.');
              setLoading(false);
            } else {
              onNavigate('/booking');
            }
          } else {
            onNavigate('/staff/dashboard');
          }
        } catch (err: any) {
          setErrorMessage(err.message || 'Error executing Microsoft SSO identity verification.');
          setLoading(false);
        }
      } else if (event.data && event.data.type === 'MS_SSO_ERROR') {
        window.removeEventListener('message', handleMessage);
        setErrorMessage(event.data.error || 'Microsoft sign-in was cancelled or failed.');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback timer to turn off loading if popup is closed
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      }
    }, 500);
  };

  const parsedBan = errorMessage && errorMessage.includes('banned') 
    ? (() => {
        const msg = errorMessage;
        const emailMatch = msg.match(/\(([^)]+)\)/);
        const reasonMatch = msg.match(/Reason:\s*(.*)$/);
        
        const email = emailMatch ? emailMatch[1] : '';
        const reason = reasonMatch ? reasonMatch[1] : 'No reason specified';
        
        const bannedIndex = msg.indexOf('has been banned ');
        const accessingIndex = msg.indexOf(' from accessing');
        let expiry = 'Permanent';
        if (bannedIndex !== -1 && accessingIndex !== -1) {
          expiry = msg.substring(bannedIndex + 'has been banned '.length, accessingIndex).trim();
        }
        return { email, reason, expiry };
      })()
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-[#5A0F0F] flex flex-col justify-center items-center p-6 relative font-sans" id="microsoft-login-page">
      
      {/* Floating Home Link */}
      <button 
        onClick={() => onNavigate('/')}
        className="absolute top-6 left-6 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all cursor-pointer border border-white/5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col relative" id="login-card">
        
        {/* Maroon top brand block */}
        <div className="bg-primary px-8 py-10 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
          
          <div className="relative z-10 space-y-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto shadow-md">
              <span className="text-white text-xl font-black font-mono">T</span>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase">Takhleeq</h2>
              {isStaff ? (
                <p className="text-[10px] text-accent font-extrabold uppercase tracking-widest mt-1">Staff Back-Office Portal</p>
              ) : (
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest mt-1">Problem Solving Institute ERP</p>
              )}
            </div>
          </div>
        </div>

        {/* Form area */}
        <div className="p-8 space-y-5">
          
          {/* Login Type Tabs */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => { setLoginMode('founder'); setErrorMessage(null); }}
              className={`py-2 px-3 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                loginMode === 'founder'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Startup Founder
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('microsoft'); setErrorMessage(null); }}
              className={`py-2 px-3 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                loginMode === 'microsoft'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Microsoft / SSO
            </button>
          </div>

          {errorMessage && !parsedBan && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl text-left leading-relaxed animate-fade-in flex gap-2">
              <Shield className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loginMode === 'founder' ? (
            <form onSubmit={handleFounderSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block font-mono">
                  Founder Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={founderEmail}
                    onChange={(e) => setFounderEmail(e.target.value)}
                    placeholder="e.g. founder@startup.pk"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block font-mono">
                  Generated Portal Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={founderPassword}
                    onChange={(e) => setFounderPassword(e.target.value)}
                    placeholder="e.g. Tk#849201"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 mt-2"
                id="founder-login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In to Founder Portal</span>
                )}
              </button>

              <p className="text-[10px] text-gray-400 text-center leading-normal pt-1">
                Your credentials are provided in your seat enrollment email. Contact admissions if you need password recovery.
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-[11px] text-gray-400">Authenticating securely via Microsoft Azure AD SSO</p>
              </div>

              {/* Microsoft branded button */}
              <button
                onClick={handleRealMicrosoftLogin}
                disabled={loading}
                className="w-full bg-[#2F2F2F] hover:bg-black text-white py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-3 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                id="microsoft-sso-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    {/* Standard Microsoft 4-box symbol */}
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 0H10.8333V10.8333H0V0Z" fill="#F25022"/>
                      <path d="M12.1667 0H23V10.8333H12.1667V0Z" fill="#7FBA00"/>
                      <path d="M0 12.1667H10.8333V23H0V12.1667Z" fill="#00A4EF"/>
                      <path d="M12.1667 12.1667H23V23H12.1667V12.1667Z" fill="#FFB900"/>
                    </svg>
                    <span>Sign in with Microsoft</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Guidelines notes */}
          <div className="text-center space-y-2 pt-4 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 font-medium leading-normal">
              {isStaff 
                ? "This login is restricted to verified administrator and manager accounts. Unauthorized login attempts are recorded on the immutable system audit trail."
                : "Active booking requests require an authorized Microsoft 365 identity. Only @ucp.edu.pk or authorized @takhleeq.pk domains are accepted."
              }
            </p>
          </div>
        </div>
      </div>



      {/* GORGEOUS ANIMATED BAN POPUP MODAL */}
      <AnimatePresence>
        {parsedBan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50"
            id="ban-popup-modal"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-rose-100 flex flex-col relative"
            >
              {/* Top banner */}
              <div className="bg-gradient-to-r from-rose-800 to-rose-950 px-6 py-8 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-radial-gradient from-white/10 to-transparent" />
                <div className="relative z-10 space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto shadow-md">
                    <Shield className="h-7 w-7 text-rose-300 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-wider uppercase">Security Access Restricted</h3>
                    <p className="text-[9px] text-rose-300 font-extrabold uppercase tracking-widest mt-0.5">Protocol BR-09: Suspended Identity</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-left">
                <p className="text-xs text-gray-600 leading-relaxed">
                  The system has intercepted an authorized authentication request but detected an active security restriction associated with this Microsoft identity.
                </p>

                <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-xl space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono col-span-1">Account</span>
                    <span className="text-gray-800 font-black font-mono text-xs col-span-2 break-all">{parsedBan.email}</span>
                  </div>
                  <div className="h-px bg-rose-100/40" />
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono col-span-1">Duration</span>
                    <span className="text-rose-700 font-black uppercase text-[10px] bg-rose-50 px-2 py-0.5 rounded border border-rose-100 inline-block col-span-2 w-max">{parsedBan.expiry}</span>
                  </div>
                  <div className="h-px bg-rose-100/40" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block font-mono">Official Reason</span>
                    <p className="text-gray-700 font-bold italic bg-white p-3 rounded-lg border border-gray-150 text-[11px] leading-relaxed">
                      "{parsedBan.reason}"
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 text-center leading-normal">
                  If you believe this restriction was applied in error, please submit an appeal to the Takhleeq Executive Office or contact your Facility Manager.
                </div>

                <button
                  onClick={() => setErrorMessage(null)}
                  className="w-full bg-rose-700 hover:bg-rose-800 text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Acknowledge & Try Another Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
