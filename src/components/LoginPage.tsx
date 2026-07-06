import React, { useState } from 'react';
import { Shield, Lock, ShieldCheck, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

interface LoginPageProps {
  isStaff?: boolean;
  onNavigate: (path: string) => void;
  onLoginSuccess: (token: string, user: User) => void;
  simulatedUsers: User[];
}

export function LoginPage({ isStaff = false, onNavigate, onLoginSuccess, simulatedUsers }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if real Microsoft SSO is configured in environment
  const hasClientId = !!(import.meta as any).env?.VITE_MICROSOFT_CLIENT_ID;

  // Filter accounts based on page scope
  // Public login (/login) allows any account, but shows a tip about @ucp.edu.pk
  // Staff login (/staff/login) only lets staff roles access
  const accountsToDisplay = isStaff 
    ? simulatedUsers.filter(u => u.role !== 'UCP Member')
    : simulatedUsers;

  const handleMicrosoftLoginClick = () => {
    setErrorMessage(null);
    setShowAccountSelector(true);
  };

  // Real Microsoft SSO OAuth 2.0 Popup Flow
  const handleRealMicrosoftLogin = () => {
    setErrorMessage(null);
    setLoading(true);

    const clientId = (import.meta as any).env?.VITE_MICROSOFT_CLIENT_ID;
    if (!clientId) {
      setErrorMessage('Microsoft Client ID is not configured in the environment.');
      setLoading(false);
      return;
    }

    const redirectUri = encodeURIComponent(window.location.origin + '/microsoft-callback.html');
    const scope = encodeURIComponent('openid email profile User.Read');
    const responseType = 'token'; // implicit grant flow to obtain token on frontend
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${redirectUri}&scope=${scope}&response_mode=fragment`;

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
          // Exchange real access token for system JWT on backend
          const response = await fetch('/api/auth/microsoft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: tokenVal })
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Microsoft SSO verification failed on the backend.');
          }

          // Successful authentication
          onLoginSuccess(data.token, data.user);
          
          if (data.user.role === 'UCP Member') {
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

  const handleSelectAccount = async (account: User) => {
    setShowAccountSelector(false);
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/simulated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate via simulated Microsoft SSO');
      }


      // Success
      onLoginSuccess(data.token, data.user);
      
      // Redirect based on role context
      if (data.user.role === 'UCP Member') {
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
      setErrorMessage(err.message || 'Error executing Microsoft SSO authentication');
      setLoading(false);
    }
  };

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
        <div className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-gray-900">Sign in to continue</h3>
            <p className="text-[11px] text-gray-400">Authenticating securely via Microsoft Azure AD SSO</p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl text-left leading-relaxed animate-fade-in flex gap-2">
              <Shield className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Microsoft branded button */}
          <button
            onClick={hasClientId ? handleRealMicrosoftLogin : handleMicrosoftLoginClick}
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
                <span>{hasClientId ? 'Sign in with Microsoft' : 'Sign in with Microsoft (Simulated)'}</span>
              </>
            )}
          </button>

          {/* Conditional helpers/simulation bypass options */}
          {hasClientId ? (
            <div className="text-center pt-1 animate-fade-in">
              <button
                onClick={handleMicrosoftLoginClick}
                type="button"
                className="text-primary hover:text-[#5A0F0F] text-[11px] font-bold hover:underline transition-all cursor-pointer inline-flex items-center gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Or bypass via Developer Account Simulator
              </button>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/50 border border-amber-150 rounded-xl text-left text-[11px] text-amber-800 leading-normal flex gap-2 animate-fade-in">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11.5px] mb-0.5 text-amber-900">Developer Simulation Active</p>
                <p className="text-gray-500 font-normal leading-relaxed text-[10px]">
                  Configure <code className="font-mono bg-amber-100/50 px-1 py-0.5 rounded text-amber-950">VITE_MICROSOFT_CLIENT_ID</code> in environment to activate real Azure AD logins.
                </p>
              </div>
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

      {/* SIMULATED ACCOUNT SELECTOR POPUP (MICROSOFT STYLE) */}
      <AnimatePresence>
        {showAccountSelector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            id="microsoft-account-selector-modal"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col"
            >
              <div className="bg-[#1F1F23] text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0H10.8333V10.8333H0V0Z" fill="#F25022"/>
                    <path d="M12.1667 0H23V10.8333H12.1667V0Z" fill="#7FBA00"/>
                    <path d="M0 12.1667H10.8333V23H0V12.1667Z" fill="#00A4EF"/>
                    <path d="M12.1667 12.1667H23V23H12.1667V12.1667Z" fill="#FFB900"/>
                  </svg>
                  <span className="text-xs font-bold font-mono tracking-wider">Microsoft Accounts</span>
                </div>
                <button 
                  onClick={() => setShowAccountSelector(false)} 
                  className="text-gray-400 hover:text-white font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1 text-left">
                  <h4 className="text-xs font-bold text-gray-900">Choose an account</h4>
                  <p className="text-[10px] text-gray-400">Select an identity to simulate Microsoft SSO login</p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {accountsToDisplay.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => handleSelectAccount(account)}
                      className="w-full p-3.5 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-primary/5 text-left flex items-center justify-between gap-3 transition-all cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 group-hover:text-primary truncate">{account.name.split(' (')[0]}</p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">{account.email}</p>
                      </div>
                      <span className="bg-primary/5 text-primary text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0">
                        {account.role}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="text-[10px] text-gray-400 text-center border-t pt-3 flex items-center justify-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-gray-400" />
                  <span>Secure OAuth 2.0 Simulation</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
