import React, { useState } from 'react';
import { 
  CalendarRange, 
  Search, 
  Shield, 
  Globe, 
  MapPin, 
  Award, 
  BookOpen, 
  ChevronRight, 
  Brain, 
  Mic, 
  Sparkles, 
  Scale, 
  Compass, 
  Cpu, 
  Users, 
  Briefcase, 
  Layers, 
  TrendingUp, 
  Coins, 
  GraduationCap, 
  Mail, 
  Phone, 
  Facebook, 
  Twitter, 
  Instagram,
  Linkedin,
  ArrowUpRight,
  LogOut,
  User,
  Tv,
  Menu,
  X
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onNavigate: (path: string, tab?: string) => void;
  activeUser: any;
  onLogout?: () => void;
}

export function LandingPage({ onNavigate, activeUser, onLogout }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 12 incubation program components grouped into 4 progressive stages (LND-15)
  const programStages = [
    {
      stageNumber: '01',
      stageName: 'Stage 1: Idea',
      stageDesc: 'Validate assumptions, understand real users, and formulate your business model.',
      items: [
        { name: 'Ideation', icon: Brain, desc: 'Developing and screening viable business models.' },
        { name: 'Lean Canvas', icon: Layers, desc: 'Rapid one-page business model formulation.' },
        { name: 'Human Centered Design', icon: Compass, desc: 'Building products rooted in genuine user needs.' },
        { name: 'Research', icon: GraduationCap, desc: 'Commercializing academic discoveries and patents.' },
      ]
    },
    {
      stageNumber: '02',
      stageName: 'Stage 2: Build',
      stageDesc: 'Assemble the founding team, prototype the product, and safeguard intellectual property.',
      items: [
        { name: 'Product Development', icon: Cpu, desc: 'Prototyping, testing, and scaling hardware/software.' },
        { name: 'Team Building', icon: Users, desc: 'Co-founder matching, culture, and talent acquisition.' },
        { name: 'Startup Legal & IP', icon: Scale, desc: 'Company registration, trademarks, and patent support.' },
      ]
    },
    {
      stageNumber: '03',
      stageName: 'Stage 3: Launch',
      stageDesc: 'Craft compelling messaging, establish brand identity, and master investor storytelling.',
      items: [
        { name: 'Marketing & Branding', icon: Sparkles, desc: 'Positioning, digital marketing, and brand identity.' },
        { name: 'Pitching Clinics', icon: Mic, desc: 'Refining storytelling and presentation for investors.' },
      ]
    },
    {
      stageNumber: '04',
      stageName: 'Stage 4: Grow',
      stageDesc: 'Optimize unit economics, sustain lean operations, and implement rigorous governance.',
      items: [
        { name: 'Revenue Modeling', icon: TrendingUp, desc: 'Pricing strategy, unit economics, and cashflow management.' },
        { name: 'Bootstrapping', icon: Coins, desc: 'Sustaining operations with minimal outside capital.' },
        { name: 'Mock Board Meetings', icon: Briefcase, desc: 'Rigorous strategic planning and governance checks.' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans selection:bg-primary/10 selection:text-primary flex flex-col" id="takhleeq-landing-page">
      
      {/* Sticky Header with backdrop-blur */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100/80 transition-all">
        <div className="w-full px-6 md:px-12 py-4 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')} id="landing-nav-logo">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-white text-lg font-black tracking-widest font-mono">T</span>
            </div>
            <div>
              <span className="text-sm font-black text-gray-900 tracking-tight uppercase block leading-none">Takhleeq</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">UCP incubator</span>
            </div>
          </div>

          {/* Nav Links (LND-08: renamed ERP Modules to Services) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-gray-600">
            <a href="#about" className="hover:text-primary transition-colors">About</a>
            <a href="#incubation" className="hover:text-primary transition-colors">Incubation Program</a>
            <a href="#services" className="hover:text-primary transition-colors">Services</a>
            <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            {activeUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/90 px-3 py-1.5 rounded-xl">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                    {(activeUser.name || activeUser.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-gray-900 leading-tight">
                      {activeUser.name ? activeUser.name.split(' (')[0] : activeUser.email}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold capitalize leading-tight">
                      {activeUser.role || 'Member'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (activeUser.role === 'Cohort Founder') {
                      onNavigate('/founder-dashboard');
                    } else if (activeUser.role === 'UCP Member') {
                      onNavigate('/booking');
                    } else {
                      onNavigate('/staff/dashboard');
                    }
                  }}
                  className="bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-primary/10 cursor-pointer flex items-center gap-1.5"
                  id="landing-portal-btn"
                >
                  <span>{activeUser.role === 'UCP Member' ? 'Book a room' : 'Go to Portal'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-200/90 hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                    title="Sign Out"
                    id="landing-logout-btn"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={() => onNavigate('/login')}
                className="bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-primary/10 cursor-pointer"
                id="landing-staff-login-btn"
              >
                Login
              </button>
            )}

            {/* Mobile Navigation Toggle (LND-07) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label="Navigation menu"
              id="mobile-nav-toggle"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span>Menu</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer (LND-07) */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md px-6 py-4 shadow-lg transition-all animate-in fade-in slide-in-from-top-2"
            id="mobile-nav-drawer"
          >
            <nav className="flex flex-col space-y-2 text-xs font-bold uppercase tracking-wider text-gray-700">
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-gray-50 hover:text-primary transition-colors"
              >
                About
              </a>
              <a
                href="#incubation"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-gray-50 hover:text-primary transition-colors"
              >
                Incubation Program
              </a>
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-gray-50 hover:text-primary transition-colors"
              >
                Services
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-gray-50 hover:text-primary transition-colors"
              >
                Contact
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-24 bg-gradient-to-b from-gray-50/50 to-white border-b border-gray-100">
        <div className="w-full px-6 md:px-12 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.1]" id="hero-title">
              Takhleeq – <span className="text-primary">UCP's Startup Incubator</span>
            </h1>

            <p className="text-base sm:text-lg font-bold text-gray-700 tracking-normal">
              Book a room, apply for incubation and track your startup, all in one place.
            </p>

            <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
              Takhleeq is UCP's startup incubator. We help students and faculty turn ideas into real businesses through mentoring, workspace and a 6-month program.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button 
                onClick={() => onNavigate('/cohort-apply')}
                className="bg-primary hover:bg-[#5A0F0F] hover:translate-y-[-1px] text-white text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2"
                id="hero-apply-btn"
              >
                <GraduationCap className="h-4 w-4 text-accent" />
                Apply for Incubation
              </button>
              <button 
                onClick={() => onNavigate('/booking')}
                className="bg-white hover:bg-gray-50 hover:translate-y-[-1px] border border-gray-300 text-gray-800 text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                id="hero-book-btn"
              >
                <CalendarRange className="h-4 w-4 text-primary" />
                Book a room
              </button>
              <button 
                onClick={() => onNavigate('/cohort-track')}
                className="text-gray-600 hover:text-primary text-xs font-bold uppercase tracking-wider px-2 py-3 transition-colors cursor-pointer inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                id="hero-track-cohort-btn"
              >
                <Search className="h-3.5 w-3.5 text-gray-400" />
                Track my application
              </button>
            </div>
          </div>

          {/* Right Highlights Card (LND-09, LND-10, LND-11) */}
          <div className="lg:col-span-5">
            <div className="bg-[#1A1A1A] text-white p-8 rounded-2xl shadow-xl space-y-6 relative overflow-hidden" id="hero-highlights-card">
              
              {/* Abs gold ribbon accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />

              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold tracking-tight">Why Takhleeq</h3>
              </div>

              <div className="space-y-5 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">UBI Global Network</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Internationally recognized for incubation excellence and university startup ecosystem impact.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Frontiers Incubator</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Implementing high-standard incubation frameworks and mentor-led curriculum cycles.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Structured Mentorship</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Hands-on guidance from experienced entrepreneurs, industry advisors, and investor clinics.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">University of Central Punjab</h4>
                    <p className="text-[11px] text-gray-400 mt-1">In Building D at UCP, serving student societies and department events.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About / Vision Mission Section */}
      <section className="py-20 bg-white" id="about">
        <div className="w-full px-6 md:px-12 lg:px-16 text-center space-y-12">
          
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">About the Institute</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Incubating Ideas, Fostering Innovation</h3>
            <div className="h-1.5 w-12 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left w-full">
            {/* Vision Card */}
            <div className="p-8 border border-gray-100 rounded-2xl bg-[#F8F5F0]/40 space-y-4 shadow-3xs">
              <h4 className="text-sm font-black text-primary uppercase tracking-wider">Our Vision</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                To build Takhleeq into a premier center of entrepreneurial excellence in Pakistan, empowering youth to transition from job seekers into job creators by solving local and global problems with technology and grit.
              </p>
            </div>

            {/* Mission Card */}
            <div className="p-8 border border-gray-100 rounded-2xl bg-[#F8F5F0]/40 space-y-4 shadow-3xs">
              <h4 className="text-sm font-black text-primary uppercase tracking-wider">Our Mission</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                To provide startups and students with rigorous mentorship, modern workspaces, seed access, legal advisory, and ecosystem networking through standard programs, helping them design products people love.
              </p>
            </div>
          </div>

          {/* Partnership badges (LND-10, LND-12) */}
          <div className="pt-8 space-y-4">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Global & National Partners</p>
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8">
              <div className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-xl flex items-center gap-2 shadow-2xs">
                <span className="text-xs font-bold text-gray-700">UBI Global Network</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-xl flex items-center gap-2 shadow-2xs">
                <span className="text-xs font-bold text-gray-700">Frontiers Incubator</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-xl flex items-center gap-2 shadow-2xs">
                <span className="text-xs font-bold text-gray-700">HEC Pakistan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incubation Curriculum / Component Section (LND-13, LND-14, LND-15) */}
      <section className="py-20 bg-gray-50/50 border-y border-gray-100" id="incubation">
        <div className="w-full px-6 md:px-12 lg:px-16 text-center space-y-12">
          
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">What you'll learn</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">6-month program, 2 intakes a year</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Every startup follows the same curriculum, from testing your idea to earning your first revenue.</p>
          </div>

          <div className="space-y-8 text-left w-full">
            {programStages.map((stage) => (
              <div key={stage.stageName} className="space-y-4 bg-white/80 border border-gray-200/80 p-6 sm:p-7 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-md bg-primary/10 text-primary font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                      {stage.stageNumber}
                    </span>
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">{stage.stageName}</h4>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">{stage.stageDesc}</p>
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${stage.items.length === 4 ? 'lg:grid-cols-4' : stage.items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
                  {stage.items.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div key={c.name} className="bg-gray-50/80 border border-gray-100/90 p-5 rounded-xl hover:border-primary/20 hover:bg-white transition-all flex flex-col gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                          <Icon className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider">{c.name}</h5>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{c.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section (LND-16 & LND-08) */}
      <section className="py-20 bg-white relative" id="services">
        <div id="modules" className="absolute -top-24 left-0 pointer-events-none" />
        <div className="w-full px-6 md:px-12 lg:px-16 text-center space-y-12">
          
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">Services</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">What you can do here</h3>
            <div className="h-1.5 w-12 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
            {/* Active module 1: Room Booking (LND-17 & LND-18) */}
            <div className="border-2 border-primary/25 bg-white p-6 rounded-2xl shadow-md shadow-primary/5 flex flex-col justify-between hover:border-primary/40 transition-all relative">
              <div className="absolute top-4 right-4 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                Active
              </div>
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <CalendarRange className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Room & Space Booking</h4>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Book the Board Room, Cube 1, Cube 2 or the Podcast Room. Pick a time and staff will confirm.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <button 
                  onClick={() => onNavigate('/booking')}
                  className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  Book a room
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => onNavigate('/room-display')}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  title="View live room schedule across all rooms"
                >
                  <Tv className="h-3.5 w-3.5 text-primary" />
                  Today's room schedule
                </button>
              </div>
            </div>

            {/* Active module 2: Incubation program (LND-19 & LND-20) */}
            <div className="border-2 border-primary/25 bg-white p-6 rounded-2xl shadow-md shadow-primary/5 flex flex-col justify-between hover:border-primary/40 transition-all relative">
              <div className="absolute top-4 right-4 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                Active
              </div>
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Incubation program</h4>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Apply for the 6-month program, track your application, and once accepted, run your startup from the founder portal.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <button 
                  onClick={() => {
                    if (!activeUser) {
                      onNavigate('/login');
                    } else if (activeUser.role === 'Cohort Founder') {
                      onNavigate('/founder-dashboard');
                    } else if (activeUser.role === 'UCP Member') {
                      onNavigate('/founder-dashboard');
                    } else {
                      onNavigate('/staff/dashboard', 'cohorts');
                    }
                  }}
                  className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  Founder login
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>

                <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 text-[10px] font-extrabold uppercase tracking-wider">
                  <button 
                    onClick={() => onNavigate('/cohort-apply')} 
                    className="text-primary hover:text-[#5A0F0F] transition-colors cursor-pointer"
                  >
                    Apply now
                  </button>
                  <button 
                    onClick={() => onNavigate('/cohort-track')} 
                    className="text-gray-500 hover:text-primary transition-colors cursor-pointer"
                  >
                    Track my application
                  </button>
                </div>
              </div>
            </div>

            {/* Inactive module 3: Sessions & Events (LND-22) */}
            <div className="border border-gray-100 bg-gray-50/30 p-6 rounded-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider">Sessions & Events</h4>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    See upcoming workshops, talks and pitch events.
                  </p>
                </div>
              </div>
              <span className="mt-6 w-full py-2 bg-gray-100 text-center text-gray-400 text-xs font-bold uppercase tracking-wider rounded-xl select-none">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary text-white py-14">
        <div className="w-full px-6 md:px-12 lg:px-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <h4 className="text-3xl sm:text-4xl font-black text-accent">6 Months</h4>
            <p className="text-xs text-white/80 uppercase font-semibold tracking-wider mt-1.5">Program Duration</p>
          </div>
          <div>
            <h4 className="text-3xl sm:text-4xl font-black text-accent">700+</h4>
            <p className="text-xs text-white/80 uppercase font-semibold tracking-wider mt-1.5">Global Network</p>
          </div>
          <div>
            <h4 className="text-3xl sm:text-4xl font-black text-accent">70+</h4>
            <p className="text-xs text-white/80 uppercase font-semibold tracking-wider mt-1.5">Countries Covered</p>
          </div>
          <div>
            <h4 className="text-3xl sm:text-4xl font-black text-accent">2 Cycles</h4>
            <p className="text-xs text-white/80 uppercase font-semibold tracking-wider mt-1.5">Per Year</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gray-50" id="contact">
        <div className="w-full px-6 md:px-12 lg:px-16 grid grid-cols-1 md:grid-cols-2 gap-12" id="landing-contact-panel">
          
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">Get In Touch</h2>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Connect with the Takhleeq Team</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Questions about applying, partnerships, mentoring or bookings? Get in touch.
            </p>

            <div className="space-y-4 text-xs text-gray-600">
              <div className="flex items-center gap-3">
                <Mail className="h-4.5 w-4.5 text-primary" />
                <span>takhleeq@ucp.edu.pk</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4.5 w-4.5 text-primary" />
                <span>(+92) 42 35880007 (Ext: 567)</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs flex flex-col justify-center space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Follow us</h4>
            <p className="text-xs text-gray-500">Stay updated on pitching events, startup graduation days, and community hackathons.</p>
            <div className="flex flex-wrap gap-3">
              <a 
                href="https://www.instagram.com/takhleeq_ucp/" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Follow Takhleeq on Instagram"
                className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-primary/5 hover:text-primary rounded-xl text-gray-600 border border-gray-200/80 text-xs font-semibold transition-all"
              >
                <Instagram className="h-4 w-4 text-primary" />
                <span>Instagram</span>
              </a>
              <a 
                href="https://www.linkedin.com/company/takhleeq-ucp/" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Follow Takhleeq on LinkedIn"
                className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-primary/5 hover:text-primary rounded-xl text-gray-600 border border-gray-200/80 text-xs font-semibold transition-all"
              >
                <Linkedin className="h-4 w-4 text-primary" />
                <span>LinkedIn</span>
              </a>
              <a 
                href="https://www.facebook.com/TakhleeqUCP/" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Follow Takhleeq on Facebook"
                className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-primary/5 hover:text-primary rounded-xl text-gray-600 border border-gray-200/80 text-xs font-semibold transition-all"
              >
                <Facebook className="h-4 w-4 text-primary" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (LND-26, LND-27, LND-28) */}
      <footer className="bg-[#121214] text-gray-400 border-t border-gray-800 py-12 px-6 mt-auto">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-gray-800">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white text-sm font-black font-mono">T</span>
              </div>
              <span className="text-sm font-black text-white tracking-tight">Takhleeq – UCP Startup Incubator</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs">
              Helping UCP students and faculty build startups.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-widest">Quick Navigation</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <a href="#incubation" className="hover:text-white transition-colors">Incubation program</a>
              <a href="#services" className="hover:text-white transition-colors">Services</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-widest">Office Location</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Takhleeq Incubator, Building D, University of Central Punjab,<br/>
              Avenue 1, Khayaban-e-Jinnah, Johar Town, Lahore, Pakistan.
            </p>
          </div>
        </div>

        <div className="w-full pt-6 flex flex-col sm:flex-row justify-between items-center text-[10px] text-gray-600 gap-4">
          <p>© 2026 Takhleeq, University of Central Punjab.</p>
          <p>Managed in partnership with UCP Facility Operations.</p>
        </div>
      </footer>

    </div>
  );
}
