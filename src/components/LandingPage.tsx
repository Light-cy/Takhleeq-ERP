import React from 'react';
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
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  activeUser: any;
}

export function LandingPage({ onNavigate, activeUser }: LandingPageProps) {
  // 12 incubation program components
  const components = [
    { name: 'Ideation', icon: Brain, desc: 'Developing and screening viable business models.' },
    { name: 'Pitching Clinics', icon: Mic, desc: 'Refining storytelling and presentation for investors.' },
    { name: 'Marketing & Branding', icon: Sparkles, desc: 'Positioning, digital marketing, and brand identity.' },
    { name: 'Startup Legal & IP', icon: Scale, desc: 'Company registration, trademarks, and patent support.' },
    { name: 'Human Centered Design', icon: Compass, desc: 'Building products rooted in genuine user needs.' },
    { name: 'Product Development', icon: Cpu, desc: 'Prototyping, testing, and scaling hardware/software.' },
    { name: 'Team Building', icon: Users, desc: 'Co-founder matching, culture, and talent acquisition.' },
    { name: 'Mock Board Meetings', icon: Briefcase, desc: 'Rigorous strategic planning and governance checks.' },
    { name: 'Lean Canvas', icon: Layers, desc: 'Rapid one-page business model formulation.' },
    { name: 'Revenue Modeling', icon: TrendingUp, desc: 'Pricing strategy, unit economics, and cashflow management.' },
    { name: 'Bootstrapping', icon: Coins, desc: 'Sustaining operations with minimal outside capital.' },
    { name: 'Research', icon: GraduationCap, desc: 'Commercializing academic discoveries and patents.' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans selection:bg-primary/10 selection:text-primary flex flex-col" id="takhleeq-landing-page">
      
      {/* Sticky Header with backdrop-blur */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
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

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-gray-600">
            <a href="#about" className="hover:text-primary transition-colors">About</a>
            <a href="#incubation" className="hover:text-primary transition-colors">Incubation Program</a>
            <a href="#modules" className="hover:text-primary transition-colors">ERP Modules</a>
            <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('/staff/login')}
              className="bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-primary/10 cursor-pointer"
              id="landing-staff-login-btn"
            >
              Staff Portal
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-24 bg-gradient-to-b from-gray-50/50 to-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full text-[11px] font-bold text-primary uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Problem Solving Institute
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.1]" id="hero-title">
              Takhleeq Problem <br className="hidden sm:block"/>
              <span className="text-primary">Solving Institute</span>
            </h1>

            <p className="text-base font-extrabold text-secondary/90 tracking-wide uppercase">
              Enterprise Resource Management System
            </p>

            <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
              Takhleeq is the state-of-the-art startup incubator of the University of Central Punjab. It serves as an ecosystem that brings together innovators, programmers, designers, and business operators to foster problem-solving methodologies and scale sustainable commercial startups.
            </p>

            <div className="flex flex-wrap gap-3.5 pt-4">
              <button 
                onClick={() => onNavigate('/booking')}
                className="bg-primary hover:bg-primary/95 hover:translate-y-[-1px] text-white text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2"
                id="hero-book-btn"
              >
                <CalendarRange className="h-4 w-4" />
                Book a Space
              </button>
              <button 
                onClick={() => onNavigate('/track')}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                id="hero-track-btn"
              >
                <Search className="h-4 w-4 text-gray-500" />
                Track Booking
              </button>
            </div>
          </div>

          {/* Right Highlights Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#1A1A1A] text-white p-8 rounded-2xl shadow-xl space-y-6 relative overflow-hidden" id="hero-highlights-card">
              
              {/* Abs gold ribbon accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />

              <div className="border-b border-white/10 pb-4">
                <span className="text-accent text-[10px] font-black uppercase tracking-wider">Takhleeq Institute</span>
                <h3 className="text-lg font-bold tracking-tight mt-1">Ecosystem Recognition</h3>
              </div>

              <div className="space-y-5 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">UBI Global Network</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Active member of a network of 700+ leading incubators and accelerators in over 70 countries.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Frontiers Incubator Partner</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Implementing high-standard incubation frameworks and mentor-led curriculum cycles.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">6-Month Incubation Program</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Two competitive startup incubation cycles per year focusing on product-market fit.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">University of Central Punjab</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Located at the heart of the UCP campus, servicing student societies and departmental events.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About / Vision Mission Section */}
      <section className="py-20 bg-white" id="about">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">About the Institute</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Incubating Ideas, Fostering Innovation</h3>
            <div className="h-1.5 w-12 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
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

          {/* Partnership badges */}
          <div className="pt-8 space-y-4">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Global & National Partners</p>
            <div className="flex flex-wrap justify-center items-center gap-8">
              <div className="bg-gray-50 border border-gray-100 px-5 py-3 rounded-xl flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase font-mono">UBI GLOBAL NETWORK</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 px-5 py-3 rounded-xl flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase font-mono">FRONTIERS ACCELERATOR</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 px-5 py-3 rounded-xl flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase font-mono">HEC PAKISTAN REGIONAL</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incubation Curriculum / Component Section */}
      <section className="py-20 bg-gray-50/50 border-y border-gray-100" id="incubation">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">6 Months, 2 Cycle Program</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Structured Incubator Components</h3>
            <p className="text-xs text-gray-500">Every startup undergoes a comprehensive curriculum tailored to validate core assumptions, develop robust products, and secure commercial growth.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {components.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-3xs hover:border-primary/20 transition-all flex flex-col gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">{c.name}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ERP Modules Section */}
      <section className="py-20 bg-white" id="modules">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">ERP Core Services</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Unified Enterprise Management Modules</h3>
            <div className="h-1.5 w-12 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left max-w-6xl mx-auto">
            {/* Active module 1: Room Booking */}
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
                    Request, validate, and manage incubator co-working desks, event auditoriums, and formal meeting boards. Includes strict automated double-booking prevention.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('/booking')}
                className="mt-6 w-full py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                Launch Module
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Inactive module 2 */}
            <div className="border border-gray-100 bg-gray-50/20 p-6 rounded-2xl flex flex-col justify-between opacity-80">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-wider">Cohort Management</h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Track applicant onboarding, incubation scoring, mentor matching, startup evaluation milestones, and seed fund requests.
                  </p>
                </div>
              </div>
              <span className="mt-6 w-full py-2 bg-gray-100 text-center text-gray-400 text-xs font-bold uppercase tracking-wider rounded-xl select-none">
                Coming Soon
              </span>
            </div>

            {/* Inactive module 3 */}
            <div className="border border-gray-100 bg-gray-50/20 p-6 rounded-2xl flex flex-col justify-between opacity-80">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-wider">Sessions & Events</h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Plan masterclasses, coordinate guest pitching webinars, distribute digital feedback, and compile attendance analytics.
                  </p>
                </div>
              </div>
              <span className="mt-6 w-full py-2 bg-gray-100 text-center text-gray-400 text-xs font-bold uppercase tracking-wider rounded-xl select-none">
                Coming Soon
              </span>
            </div>

            {/* Inactive module 4 */}
            <div className="border border-gray-100 bg-gray-50/20 p-6 rounded-2xl flex flex-col justify-between opacity-80">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-wider">Dashboard & Analytics</h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Generate deep insights on space utilization ratios, society booking trends, cohort engagement metrics, and active policy violators.
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
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
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
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12" id="landing-contact-panel">
          
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">Get In Touch</h2>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Connect with the Takhleeq Team</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              If you have any questions regarding cohort applications, corporate partnerships, mentoring sessions, or booking policies, reach out to our office operations desk directly.
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
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Official Social Media Channel</h4>
            <p className="text-xs text-gray-500">Stay updated on pitching events, startup graduation days, and community hackathons.</p>
            <div className="flex gap-4">
              <a href="#" className="h-10 w-10 bg-gray-50 hover:bg-primary/5 hover:text-primary rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 transition-all"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="h-10 w-10 bg-gray-50 hover:bg-primary/5 hover:text-primary rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 transition-all"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="h-10 w-10 bg-gray-50 hover:bg-primary/5 hover:text-primary rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 transition-all"><Instagram className="h-5 w-5" /></a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#121214] text-gray-400 border-t border-gray-800 py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-gray-800">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white text-sm font-black font-mono">T</span>
              </div>
              <span className="text-sm font-black text-white tracking-tight uppercase">Takhleeq ERP</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs">
              Empowering next-generation founders, developers, and makers with a robust platform to organize, validate, and launch products.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-widest">Quick Navigation</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <a href="#about" className="hover:text-white transition-colors">About Us</a>
              <a href="#incubation" className="hover:text-white transition-colors">Program Specs</a>
              <a href="#modules" className="hover:text-white transition-colors">Core Modules</a>
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

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row justify-between items-center text-[10px] text-gray-600 gap-4">
          <p>© 2025 Takhleeq Problem Solving Institute. All Rights Reserved.</p>
          <p>Managed in partnership with UCP Facility Operations.</p>
        </div>
      </footer>

    </div>
  );
}
