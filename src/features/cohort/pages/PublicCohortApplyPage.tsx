import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  User, 
  GraduationCap,
  ClipboardCheck, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Copy, 
  Search,
  ChevronRight,
  AlertTriangle,
  Edit2,
  Check
} from 'lucide-react';
import { FormField } from '../../../types';

interface PublicCohortApplyPageProps {
  onNavigate: (path: string) => void;
}

const STEP_LABELS = [
  { step: 1, label: 'Startup' },
  { step: 2, label: 'Team lead' },
  { step: 3, label: 'UCP details' },
  { step: 4, label: 'Review' }
];

const DISCOVERY_OPTIONS = [
  'Takhleeq social media',
  'UCP social media',
  'Dean, HoD or faculty',
  'Screens around UCP'
];

const STAGE_OPTIONS = [
  'Idea',
  'Problem discovery',
  'Market validation',
  'Prototype / MVP',
  'Earning revenue',
  'Scaling'
];

const TEAM_SIZE_OPTIONS = [
  'Just me',
  '2',
  '3',
  '4',
  '5 or more'
];

const UCP_CONNECTION_OPTIONS = [
  'Current student',
  'Faculty',
  'Staff',
  'Alumni'
];

export const PublicCohortApplyPage: React.FC<PublicCohortApplyPageProps> = ({ onNavigate }) => {
  const [formSettings, setFormSettings] = useState<{ is_active: boolean; cohort_name?: string; fields: FormField[] } | null>(null);
  const [liveCohortName, setLiveCohortName] = useState<string>('Cohort 1');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [duplicateEmailError, setDuplicateEmailError] = useState<{ isDuplicate: boolean; message: string; existingToken?: string } | null>(null);

  // 4-Step Wizard State (APP-21)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Startup Fields
  const [startupName, setStartupName] = useState('');
  const [ventureType, setVentureType] = useState('Product-based');
  const [stage, setStage] = useState('Idea');
  const [businessModel, setBusinessModel] = useState('');
  const [startupDesc, setStartupDesc] = useState('');
  const [services, setServices] = useState('');
  const [discovery, setDiscovery] = useState('Takhleeq social media');
  const [teamSize, setTeamSize] = useState('Just me');

  // Step 2: Team Lead Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [teamRole, setTeamRole] = useState('');
  const [skillset, setSkillset] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [pastProjects, setPastProjects] = useState('');

  // Step 3: UCP Details Fields
  const [ucpStatus, setUcpStatus] = useState('Current student');
  const [rollNumber, setRollNumber] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [department, setDepartment] = useState('');
  const [degree, setDegree] = useState('');
  const [isWorking, setIsWorking] = useState('No');
  const [workDetails, setWorkDetails] = useState('');

  // Dynamic / Additional fields support
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch form configuration and live cohort name
  useEffect(() => {
    fetch('/api/cohort-form-settings')
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve form settings.');
        return res.json();
      })
      .then(data => {
        setFormSettings(data);
        if (data.cohort_name) {
          setLiveCohortName(data.cohort_name);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('The admissions server appears currently busy. Please try again.');
        setLoading(false);
      });
  }, []);

  // Format Pakistani mobile number format (e.g., 03xx-xxxxxxx)
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').substring(0, 11);
    let formatted = clean;
    if (clean.length > 4) {
      formatted = `${clean.substring(0, 4)}-${clean.substring(4)}`;
    }
    setPhone(formatted);
  };

  const handleCopyToken = () => {
    if (submittedToken) {
      navigator.clipboard.writeText(submittedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Step Navigation & Validation
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextStep = () => {
    setStepError(null);

    if (currentStep === 1) {
      if (!startupName.trim()) {
        setStepError('Please enter your startup / idea name.');
        return;
      }
      if (!startupDesc.trim()) {
        setStepError('Please describe your startup or business idea.');
        return;
      }
      if (!businessModel.trim()) {
        setStepError('Please enter your business model.');
        return;
      }
      if (!discovery) {
        setStepError('Please select how you heard about Takhleeq.');
        return;
      }
      if (!stage) {
        setStepError('Please select your current startup stage.');
        return;
      }
      if (!teamSize) {
        setStepError('Please select your team size.');
        return;
      }
      setCurrentStep(2);
      scrollToTop();
    } else if (currentStep === 2) {
      if (!name.trim()) {
        setStepError('Please enter the team lead full name.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setStepError('Please enter a valid email address.');
        return;
      }
      if (!phone.trim()) {
        setStepError('Please enter the contact phone number.');
        return;
      }
      if (!city.trim()) {
        setStepError('Please enter your city.');
        return;
      }
      if (!teamRole.trim()) {
        setStepError('Please enter your role in the team.');
        return;
      }
      if (!skillset.trim()) {
        setStepError('Please explain how your skillset contributes to this venture.');
        return;
      }
      setCurrentStep(3);
      scrollToTop();
    } else if (currentStep === 3) {
      if (!ucpStatus) {
        setStepError('Please select your connection to UCP.');
        return;
      }
      if (!batchYear.trim()) {
        setStepError('Please enter the year your batch started.');
        return;
      }
      if (!department.trim()) {
        setStepError('Please enter your department.');
        return;
      }
      if (!degree.trim()) {
        setStepError('Please enter your degree or position.');
        return;
      }
      if (isWorking === 'Yes' && !workDetails.trim()) {
        setStepError('Please enter your company and job title.');
        return;
      }
      setCurrentStep(4);
      scrollToTop();
    }
  };

  const handlePrevStep = () => {
    setStepError(null);
    setCurrentStep(prev => Math.max(1, prev - 1));
    scrollToTop();
  };

  const handleEditStep = (stepNumber: number) => {
    setStepError(null);
    setCurrentStep(stepNumber);
    scrollToTop();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setStepError(null);
    setDuplicateEmailError(null);

    // Map all fields cleanly for submission
    const finalFormData: Record<string, any> = {
      field_startup_name: startupName.trim(),
      field_q2_venture_type: ventureType,
      field_startup_desc: startupDesc.trim(),
      field_q4_services: services.trim(),
      field_q5_business_model: businessModel.trim(),
      field_q6_discovery: discovery,
      field_q7_stage: stage,
      field_q8_team_size: teamSize,
      field_founder_name: name.trim(),
      field_founder_email: email.toLowerCase().trim(),
      field_founder_phone: phone.trim(),
      field_city: city.trim(),
      field_q18_team_role: teamRole.trim(),
      field_q19_skillset: skillset.trim(),
      field_q20_linkedin: linkedin.trim(),
      field_q21_past_projects: pastProjects.trim(),
      field_q22_status: ucpStatus,
      field_q14_roll_number: rollNumber.trim(),
      field_q23_batch_year: batchYear.trim(),
      field_q24_department: department.trim(),
      field_q25_degree: degree.trim(),
      field_q26_working: isWorking,
      field_q27_work_details: isWorking === 'Yes' ? workDetails.trim() : '',
      ...dynamicAnswers
    };

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
          cnic: '', // Removed per APP-11 (collected at onboarding)
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
      scrollToTop();
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
  const isFormActive = Boolean(formSettings && (formSettings.is_active === true || formSettings.is_active === 'true' || formSettings.is_active === 1));

  if (formSettings && !isFormActive && !submittedToken) {
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
          {/* Top Header per APP-02 & APP-03 */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Apply for {liveCohortName}
            </h1>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              It takes about 10 minutes. Fields marked * are required. We’ll email you a tracking ID.
            </p>
          </div>

          {/* 4-Step Progress Bar per APP-21 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6 shadow-3xs">
            <div className="grid grid-cols-4 gap-2 mb-4">
              {STEP_LABELS.map((s) => {
                const isCompleted = currentStep > s.step;
                const isCurrent = currentStep === s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    disabled={s.step > currentStep}
                    onClick={() => handleEditStep(s.step)}
                    className={`flex flex-col items-center gap-1.5 text-center transition-all ${
                      s.step <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      isCompleted 
                        ? 'bg-emerald-600 text-white' 
                        : isCurrent 
                          ? 'bg-primary text-white ring-4 ring-rose-50' 
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? <Check className="h-4 w-4" /> : s.step}
                    </div>
                    <span className={`text-[11px] font-bold tracking-tight ${
                      isCurrent ? 'text-primary font-black' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Progress track */}
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Global Alert / Duplicate Error */}
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
                    setCurrentStep(2);
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
          ) : stepError ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{stepError}</span>
            </div>
          ) : null}

          {/* FORM CONTAINER */}
          <div className="bg-white border border-gray-100 shadow-3xs rounded-2xl p-6 md:p-10 space-y-8 text-left">
            
            {/* STEP 1: STARTUP (APP-07: "About your startup") */}
            {currentStep === 1 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-base font-black text-gray-900 tracking-tight">About your startup</h2>
                    <p className="text-[11px] text-gray-400 font-medium">Tell us about your venture, product, and progress</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700">What is the name of your startup? *</label>
                    <input
                      type="text"
                      required
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                      placeholder="e.g. MedRoute"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Is this a product-based or service-based venture? *</label>
                    <select
                      value={ventureType}
                      onChange={(e) => setVentureType(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      <option value="Product-based">Product-based</option>
                      <option value="Service-based">Service-based</option>
                      <option value="Hybrid / Both">Hybrid / Both</option>
                    </select>
                  </div>

                  {/* Q7 Stage per APP-09 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">What stage is your startup currently at? *</label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      {STAGE_OPTIONS.map((stg) => (
                        <option key={stg} value={stg}>{stg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700">What is your business model? (e.g., B2B, B2C, subscription-based, etc.) *</label>
                    <input
                      type="text"
                      required
                      value={businessModel}
                      onChange={(e) => setBusinessModel(e.target.value)}
                      placeholder="e.g. B2B SaaS, B2C Subscription, Marketplace commission"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  {/* Startup Description per APP-19 */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700">Describe your idea/startup. What does it do, and how does it work? *</label>
                    <textarea
                      required
                      rows={4}
                      value={startupDesc}
                      onChange={(e) => setStartupDesc(e.target.value)}
                      placeholder="In 2–3 sentences: the problem you solve, for whom, and how far you’ve got."
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold resize-none leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700">If you’re providing services, describe your offerings and any clients you’ve worked with</label>
                    <textarea
                      rows={3}
                      value={services}
                      onChange={(e) => setServices(e.target.value)}
                      placeholder="Describe service offerings and client history if applicable (optional)"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold resize-none leading-relaxed"
                    />
                  </div>

                  {/* Discovery Question per APP-05 & APP-06 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">How did you hear about Takhleeq? *</label>
                    <select
                      value={discovery}
                      onChange={(e) => setDiscovery(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      {DISCOVERY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Team Size per APP-10 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">How many people are in your team? *</label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      {TEAM_SIZE_OPTIONS.map((ts) => (
                        <option key={ts} value={ts}>{ts}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 1 Actions */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full sm:w-auto bg-primary hover:bg-[#5A0F0F] text-white py-3.5 px-7 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-3xs"
                  >
                    Continue to Team lead
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: TEAM LEAD (APP-08: "Team lead", APP-11, APP-12, APP-14, APP-18) */}
            {currentStep === 2 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-base font-black text-gray-900 tracking-tight">Team lead</h2>
                    <p className="text-[11px] text-gray-400 font-medium">Primary contact and venture founder particulars</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Zohaib Niaz"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  {/* Email with helper text per APP-18 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Email Address *</label>
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
                    <p className="text-[10px] text-gray-400 font-medium">
                      We’ll email your tracking ID and updates here. One application per email.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="e.g. 0300-1234567"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  {/* City field per APP-12 (replaces Location & Postal address) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lahore"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  {/* Q18–Q21 without "Team Lead:" prefix per APP-14 */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700">Your role in the team *</label>
                    <input
                      type="text"
                      required
                      value={teamRole}
                      onChange={(e) => setTeamRole(e.target.value)}
                      placeholder="e.g. Founder & CEO, Chief Technology Officer"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700">How does your skillset contribute to this venture? *</label>
                    <textarea
                      required
                      rows={3}
                      value={skillset}
                      onChange={(e) => setSkillset(e.target.value)}
                      placeholder="Explain technical, business, design or domain expertise..."
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold resize-none leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700">LinkedIn profile (optional)</label>
                    <input
                      type="text"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700">Have you worked on a project before? If yes, describe briefly</label>
                    <textarea
                      rows={3}
                      value={pastProjects}
                      onChange={(e) => setPastProjects(e.target.value)}
                      placeholder="Describe previous projects, hackathons, academic research or ventures..."
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-primary hover:bg-[#5A0F0F] text-white py-3.5 px-7 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-3xs"
                  >
                    Continue to UCP details
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: UCP DETAILS (APP-13, APP-15, APP-16, APP-17) */}
            {currentStep === 3 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-base font-black text-gray-900 tracking-tight">UCP details</h2>
                    <p className="text-[11px] text-gray-400 font-medium">University affiliation, faculty connection, and employment</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Q22 per APP-15 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">What’s your connection to UCP? *</label>
                    <select
                      value={ucpStatus}
                      onChange={(e) => setUcpStatus(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      {UCP_CONNECTION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Q14 per APP-13 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">UCP roll number (students only)</label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="UCP roll number (students only)"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  {/* Q23 per APP-16 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Which year did your batch start? *</label>
                    <input
                      type="text"
                      required
                      value={batchYear}
                      onChange={(e) => setBatchYear(e.target.value)}
                      placeholder="e.g. 2022"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Department *</label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science, Business School"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Degree/Position *</label>
                    <input
                      type="text"
                      required
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="e.g. BS Computer Science, Assistant Professor"
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700">Are you currently working? *</label>
                    <select
                      value={isWorking}
                      onChange={(e) => setIsWorking(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {/* Q27 conditional display per APP-17: only show when Q26 is Yes */}
                  {isWorking === 'Yes' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1.5 md:col-span-2"
                    >
                      <label className="text-[11px] font-bold text-gray-700">Where do you work? (company and job title)</label>
                      <input
                        type="text"
                        value={workDetails}
                        onChange={(e) => setWorkDetails(e.target.value)}
                        placeholder="Company name and job title"
                        className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all font-bold"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Step 3 Actions */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-primary hover:bg-[#5A0F0F] text-white py-3.5 px-7 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-3xs"
                  >
                    Review application
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: REVIEW (APP-20 & APP-21) */}
            {currentStep === 4 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-base font-black text-gray-900 tracking-tight">Review your application</h2>
                    <p className="text-[11px] text-gray-400 font-medium">Verify your details before submitting to the incubation board</p>
                  </div>
                </div>

                {/* Section 1 Review: Startup */}
                <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">About your startup</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditStep(1)}
                      className="text-primary hover:text-[#5A0F0F] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Startup / Idea Name</span>
                      <span className="font-bold text-gray-900">{startupName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Venture Type</span>
                      <span className="font-bold text-gray-900">{ventureType || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Startup Stage</span>
                      <span className="font-bold text-gray-900">{stage || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Team Size</span>
                      <span className="font-bold text-gray-900">{teamSize || '—'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Business Model</span>
                      <span className="font-bold text-gray-900">{businessModel || '—'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Description</span>
                      <p className="font-medium text-gray-800 leading-relaxed mt-0.5">{startupDesc || '—'}</p>
                    </div>
                    {services && (
                      <div className="md:col-span-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Service Offerings</span>
                        <p className="font-medium text-gray-800 leading-relaxed mt-0.5">{services}</p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">How did you hear about Takhleeq?</span>
                      <span className="font-bold text-gray-900">{discovery || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2 Review: Team Lead */}
                <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Team lead</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditStep(2)}
                      className="text-primary hover:text-[#5A0F0F] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Full Name</span>
                      <span className="font-bold text-gray-900">{name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Email Address</span>
                      <span className="font-bold text-gray-900">{email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Phone Number</span>
                      <span className="font-bold text-gray-900">{phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">City</span>
                      <span className="font-bold text-gray-900">{city || '—'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Role in the Team</span>
                      <span className="font-bold text-gray-900">{teamRole || '—'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Skillset Contribution</span>
                      <p className="font-medium text-gray-800 leading-relaxed mt-0.5">{skillset || '—'}</p>
                    </div>
                    {linkedin && (
                      <div className="md:col-span-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">LinkedIn Profile</span>
                        <span className="font-bold text-gray-900">{linkedin}</span>
                      </div>
                    )}
                    {pastProjects && (
                      <div className="md:col-span-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Previous Project Experience</span>
                        <p className="font-medium text-gray-800 leading-relaxed mt-0.5">{pastProjects}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3 Review: UCP Details */}
                <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">UCP details</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditStep(3)}
                      className="text-primary hover:text-[#5A0F0F] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Connection to UCP</span>
                      <span className="font-bold text-gray-900">{ucpStatus || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Roll Number</span>
                      <span className="font-bold text-gray-900">{rollNumber || 'Not provided (non-student)'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Batch Starting Year</span>
                      <span className="font-bold text-gray-900">{batchYear || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Department</span>
                      <span className="font-bold text-gray-900">{department || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Degree / Position</span>
                      <span className="font-bold text-gray-900">{degree || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Currently Working?</span>
                      <span className="font-bold text-gray-900">{isWorking}</span>
                    </div>
                    {isWorking === 'Yes' && workDetails && (
                      <div className="md:col-span-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Work Details (Company & Job Title)</span>
                        <span className="font-bold text-gray-900">{workDetails}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4 Submission Actions per APP-20 */}
                <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
                    {/* Copy above submit button per APP-20 */}
                    <span className="text-[11px] text-gray-500 font-medium text-center sm:text-right max-w-xs">
                      By submitting, you confirm this information is true and the idea belongs to your team.
                    </span>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full sm:w-auto min-w-[200px] bg-primary hover:bg-[#5A0F0F] text-white py-4 px-8 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-45 disabled:cursor-not-allowed shadow-3xs shrink-0"
                    >
                      {submitting ? 'Submitting Application...' : 'Submit Application'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
