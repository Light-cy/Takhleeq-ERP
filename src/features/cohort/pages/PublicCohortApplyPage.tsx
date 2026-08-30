import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  Search,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { FormField } from '../../../types';

interface PublicCohortApplyPageProps {
  onNavigate: (path: string) => void;
}

export const PublicCohortApplyPage: React.FC<PublicCohortApplyPageProps> = ({ onNavigate }) => {
  const [formSettings, setFormSettings] = useState<{ is_active: boolean; fields: FormField[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateEmailError, setDuplicateEmailError] = useState<{ isDuplicate: boolean; message: string; existingToken?: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [startupName, setStartupName] = useState('');
  const [startupDesc, setStartupDesc] = useState('');
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch form configuration
  useEffect(() => {
    fetch('/api/cohort-form-settings')
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve form settings.');
        return res.json();
      })
      .then(data => {
        setFormSettings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('The admissions server appears currently busy. Please try again.');
        setLoading(false);
      });
  }, []);

  // Format CNIC with dashes automatically (xxxxx-xxxxxxx-x)
  const handleCnicChange = (val: string) => {
    const clean = val.replace(/\D/g, '').substring(0, 13);
    let formatted = clean;
    if (clean.length > 5 && clean.length <= 12) {
      formatted = `${clean.substring(0, 5)}-${clean.substring(5)}`;
    } else if (clean.length > 12) {
      formatted = `${clean.substring(0, 5)}-${clean.substring(5, 12)}-${clean.substring(12, 13)}`;
    }
    setCnic(formatted);
  };

  // Format Pakistani mobile number format (e.g., 03xx-xxxxxxx)
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').substring(0, 11);
    let formatted = clean;
    if (clean.length > 4) {
      formatted = `${clean.substring(0, 4)}-${clean.substring(4)}`;
    }
    setPhone(formatted);
  };

  const handleDynamicChange = (fieldId: string, val: any) => {
    setDynamicAnswers(prev => ({
      ...prev,
      [fieldId]: val
    }));
  };

  const handleCopyToken = () => {
    if (submittedToken) {
      navigator.clipboard.writeText(submittedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setDuplicateEmailError(null);

    // Dynamic field responses mapping
    const finalFormData: Record<string, any> = {};
    if (formSettings) {
      formSettings.fields.forEach(field => {
        // Skip core fields if they are already mapped
        const isCore = ['field_startup_name', 'field_startup_desc', 'field_founder_name', 'field_founder_email', 'field_founder_phone', 'field_founder_cnic'].includes(field.id);
        if (!isCore) {
          finalFormData[field.id] = dynamicAnswers[field.id] !== undefined ? dynamicAnswers[field.id] : '';
        }
      });
    }

    try {
      const response = await fetch('/api/applicants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          cnic: cnic.trim(),
          startup_name: startupName.trim(),
          startup_description: startupDesc.trim(),
          form_data: finalFormData
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        if (resData.is_duplicate_email || (resData.error && resData.error.toLowerCase().includes('already been submitted'))) {
          setDuplicateEmailError({
            isDuplicate: true,
            message: resData.error,
            existingToken: resData.existing_token
          });
        }
        throw new Error(resData.error || 'Failed to submit application.');
      }

      setSubmittedToken(resData.tracking_token);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 bg-white">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-4 animate-pulse">Loading Application form...</p>
      </div>
    );
  }

  // Handle case where administrator sets Form Settings to Offline
  if (formSettings && !formSettings.is_active && !submittedToken) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-4 py-16 text-center" id="public-apply-closed">
        <div className="max-w-xl mx-auto bg-white border border-gray-100 rounded-2xl p-8 md:p-12 shadow-3xs space-y-6">
          <div className="h-16 w-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 animate-pulse">
            <AlertTriangle className="h-7 w-7" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Admissions Intake Closed</h1>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              Takhleeq's dynamic cohort intake window is currently offline or undergoing administrative review.
            </p>
          </div>

          <div className="border-t border-gray-100 my-6 pt-6 flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('/cohort-track')}
              className="w-full md:w-auto bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold py-3.5 px-6 rounded-xl border border-gray-150 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="h-4 w-4" />
              Track Submitted Application
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="w-full md:w-auto bg-primary hover:bg-[#5A0F0F] text-white text-xs font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
            >
              Back to Home
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full" id="public-cohort-apply-page">
      
      {/* SUCCESS SCREEN */}
      {submittedToken ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl mx-auto bg-white border border-emerald-100 rounded-2xl p-8 md:p-12 shadow-sm text-center space-y-8"
          id="apply-success-card"
        >
          <div className="h-16 w-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-3">
            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-emerald-100">
              Application Logged Successfully
            </span>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Takhleeq Admissions Board</h1>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              Your startup incubation request has been saved. Please write down your tracking token to check progress in real-time.
            </p>
          </div>

          {/* Token Copy Section */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-150 relative overflow-hidden flex flex-col items-center">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">Admission Token Code</span>
            <div className="flex items-center gap-3.5 mt-2.5">
              <span className="text-lg font-black font-mono tracking-wider text-gray-800 bg-white border border-gray-150 rounded-xl px-5 py-2.5 shadow-3xs">
                {submittedToken}
              </span>
              <button
                type="button"
                onClick={handleCopyToken}
                className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-primary transition-all cursor-pointer shadow-3xs"
                title="Copy Token"
              >
                <Copy className="h-4.5 w-4.5" />
              </button>
            </div>
            {copied && (
              <span className="text-[10px] text-emerald-600 font-bold mt-2 animate-pulse">Copied to clipboard!</span>
            )}
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            <button
              onClick={() => onNavigate('/')}
              className="w-full md:w-auto bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold py-3.5 px-6 rounded-xl border border-gray-150 transition-all cursor-pointer"
            >
              Back to Portal
            </button>
            <button
              onClick={() => onNavigate(`/cohort-track`)}
              className="w-full md:w-auto bg-primary hover:bg-[#5A0F0F] text-white text-xs font-bold py-3.5 px-6 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-2"
            >
              Track Status Now
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        /* APPLICATION FORM */
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-rose-50 text-primary text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full border border-rose-100 shadow-3xs">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Takhleeq Admissions Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Incubation & Accel Cohort Apply</h1>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              Establish your venture's blueprint inside UCP's leading entrepreneurial ecosystem. Answer all questionnaire fields carefully.
            </p>
          </div>

          {duplicateEmailError ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 text-left space-y-3 shadow-3xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-black text-rose-900 text-sm">Email Address Already Registered</h4>
                  <p className="leading-relaxed">{duplicateEmailError.message}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/cohort-track')}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Search className="h-3.5 w-3.5" />
                  Track Existing Application
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateEmailError(null);
                    setError(null);
                    setEmail('');
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-rose-100/50 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Use a Different Email
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 text-left leading-relaxed">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="bg-white border border-gray-100 shadow-3xs rounded-2xl p-6 md:p-10 space-y-8 text-left">
            
            {/* SECTION 1: Core Startup Identity */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Venture Profile</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono">Startup / Idea Name *</label>
                  <input
                    type="text"
                    required
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    placeholder="e.g. MedRoute"
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono">Idea / Business Description *</label>
                <textarea
                  required
                  rows={4}
                  value={startupDesc}
                  onChange={(e) => setStartupDesc(e.target.value)}
                  placeholder="Explain your venture value proposition, product mechanics, and current milestone progress in 2-3 concise sentences..."
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* SECTION 2: Founder Particulars */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Primary Founder details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Zohaib Niaz"
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono">Email Address *</label>
                    <span className="text-[10px] text-gray-400 font-medium">1 application per email</span>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (duplicateEmailError) setDuplicateEmailError(null);
                      if (error) setError(null);
                    }}
                    placeholder="founder@startup.pk"
                    className={`w-full border rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none transition-all font-bold ${
                      duplicateEmailError?.isDuplicate 
                        ? 'bg-rose-50/50 border-rose-400 focus:border-rose-500 focus:bg-white text-rose-900' 
                        : 'bg-gray-50 border-gray-150 focus:border-primary focus:bg-white'
                    }`}
                  />
                  {duplicateEmailError?.isDuplicate ? (
                    <span className="text-[10px] font-bold text-rose-600 block">
                      This email is already in use. Please enter a different email address.
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 block">
                      Confirmation token and program updates will be delivered here.
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono">CNIC Number (identity) *</label>
                  <input
                    type="text"
                    required
                    value={cnic}
                    onChange={(e) => handleCnicChange(e.target.value)}
                    placeholder="e.g. 35201-1234567-1"
                    className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Dynamic Custom Fields configured by Admin */}
            {formSettings && formSettings.fields.filter(f => !['field_startup_name', 'field_startup_desc', 'field_founder_name', 'field_founder_email', 'field_founder_phone', 'field_founder_cnic'].includes(f.id)).length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                  <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Dynamic Program Evaluation</h2>
                </div>

                <div className="space-y-5">
                  {formSettings.fields
                    .filter(f => !['field_startup_name', 'field_startup_desc', 'field_founder_name', 'field_founder_email', 'field_founder_phone', 'field_founder_cnic'].includes(f.id))
                    .map(field => (
                      <div key={field.id} className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 font-mono">
                          {field.label} {field.required ? '*' : ''}
                        </label>
                        
                        {field.type === 'select' && field.options ? (
                          <select
                            required={field.required}
                            value={dynamicAnswers[field.id] || ''}
                            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                            className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold cursor-pointer"
                          >
                            <option value="">Select an option...</option>
                            {field.options.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            required={field.required}
                            rows={3}
                            value={dynamicAnswers[field.id] || ''}
                            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                            placeholder={field.placeholder || "Enter details..."}
                            className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold resize-none leading-relaxed"
                          />
                        ) : field.type === 'file' ? (
                          <input
                            type="text" // Simulated file upload paths as simple clean text/URLs for testing
                            required={field.required}
                            value={dynamicAnswers[field.id] || ''}
                            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                            placeholder={field.placeholder || "Paste pitch deck PDF Google Drive / Dropbox link..."}
                            className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                          />
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                            required={field.required}
                            value={dynamicAnswers[field.id] || ''}
                            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                            placeholder={field.placeholder || "Enter details..."}
                            className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Submit Action Block */}
            <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="text-[10px] text-gray-400 font-bold leading-normal text-center md:text-left">
                By submitting this form, you certify that all information submitted is true, original, and represents your registered startup idea.
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto min-w-[200px] bg-primary hover:bg-[#5A0F0F] text-white py-4 px-8 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-45 disabled:cursor-not-allowed shadow-3xs shrink-0"
              >
                {submitting ? 'Submitting Blueprint...' : 'Submit Application'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
