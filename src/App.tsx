import React, { useState, useEffect } from 'react';
import { 
  CalendarRange, 
  Search, 
  ShieldAlert, 
  Activity, 
  Settings, 
  Menu, 
  X, 
  User, 
  Shield, 
  FileText,
  RotateCcw,
  CheckCircle2,
  Lock,
  Globe,
  LogOut,
  Building,
  Key,
  Users,
  Database,
  MapPin,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Imported Pages & Subcomponents
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { BookingFormPage } from './components/BookingFormPage';
import { TrackPage } from './components/TrackPage';
import { StaffReviewQueue } from './components/StaffReviewQueue';
import { BookingCalendarDashboard } from './components/BookingCalendarDashboard';
import { GovernanceCenterPage } from './components/GovernanceCenterPage';
import { RoomManagementPage } from './components/RoomManagementPage';
import { AuditLogsPage } from './components/AuditLogsPage';

// Types
import { Room, Booking, Ban, CustomRole, User as ERPUser, AuditRecord } from './types';

export default function App() {
  // Real path-based URL state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Current tab for staff back-office (/staff/dashboard)
  // Options: 'queue' | 'register' | 'governance' | 'rooms' | 'audits'
  const [activeTab, setActiveTab] = useState<string>('queue');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Simulated identities for testing complex roles & Microsoft SSO simulation
  const simulatedIdentities: ERPUser[] = [
    { email: 'usman@society.pk', name: 'Usman Ghani (Society Rep)', role: 'UCP Member', status: 'Active' },
    { email: 'faisal@ucp.edu.pk', name: 'Faisal Mehmood (Coordinator)', role: 'Facility Coordinator', status: 'Active' },
    { email: 'maheen@ucp.edu.pk', name: 'Maheen Malik (Manager)', role: 'Booking Manager', status: 'Active' },
    { email: 'director@takhleeq.pk', name: 'Dr. Qaseeb (Director)', role: 'Administrator', status: 'Active' }
  ];

  const [activeUser, setActiveUser] = useState<ERPUser>(simulatedIdentities[3]); // Default to Administrator for easy testing

  // Core synchronized database states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [users, setUsers] = useState<ERPUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Custom multi-route navigation handler
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setMobileMenuOpen(false);
  };

  // Sync back & forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch all state tables from Express server
  const fetchStateData = async (token = jwtToken) => {
    const currentToken = token || jwtToken;
    if (!currentToken) return;

    try {
      const headers = { 'Authorization': `Bearer ${currentToken}` };
      const [roomsRes, bookingsRes, bansRes, rolesRes, usersRes] = await Promise.all([
        fetch('/api/rooms', { headers }),
        fetch('/api/bookings', { headers }),
        fetch('/api/bans', { headers }),
        fetch('/api/roles', { headers }),
        fetch('/api/users', { headers })
      ]);

      const safeParseJSON = async (res: Response, defaultValue: any = []) => {
        if (!res.ok) {
          console.warn(`Response was not OK for url ${res.url}: ${res.status}`);
          return defaultValue;
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`Response did not return application/json for url ${res.url}`);
          return defaultValue;
        }
        try {
          return await res.json();
        } catch (e) {
          console.error(`Failed to parse JSON for url ${res.url}:`, e);
          return defaultValue;
        }
      };

      const [roomsData, bookingsData, bansData, rolesData, usersData] = await Promise.all([
        safeParseJSON(roomsRes),
        safeParseJSON(bookingsRes),
        safeParseJSON(bansRes),
        safeParseJSON(rolesRes),
        safeParseJSON(usersRes)
      ]);

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setBans(Array.isArray(bansData) ? bansData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);

      // Admin role can fetch raw ledger logs
      const auditRes = await fetch('/api/audit-logs', { headers });
      if (auditRes.ok) {
        const auditData = await safeParseJSON(auditRes, []);
        setAuditLogs(Array.isArray(auditData) ? auditData : []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching ERP database tables', err);
      setLoading(false);
    }
  };

  // Configure simulated Azure authentication token on boot
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await fetch('/api/auth/simulated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: activeUser.email })
        });
        if (response.ok) {
          const data = await response.json();
          setJwtToken(data.token);
          setActiveUser(data.user);
          await fetchStateData(data.token);
        }
      } catch (err) {
        console.error('Error during initial simulated SSO setup:', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // Sync profile impersonation selection
  const handleActiveIdentityChange = async (email: string) => {
    const found = simulatedIdentities.find(i => i.email === email);
    if (found) {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/simulated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: found.email })
        });
        if (response.ok) {
          const data = await response.json();
          setJwtToken(data.token);
          setActiveUser(data.user);
          await fetchStateData(data.token);

          // Auto route to respective environments
          if (data.user.role === 'UCP Member') {
            navigate('/booking');
          } else {
            navigate('/staff/dashboard');
          }
        }
      } catch (err) {
        console.error('Error switching identities via SSO:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Logout routine
  const handleLogout = () => {
    setJwtToken(null);
    setActiveUser(simulatedIdentities[0]); // Reset to student society profile
    navigate('/');
  };

  // SSO Login callback
  const handleLoginSuccess = (token: string, user: ERPUser) => {
    setJwtToken(token);
    setActiveUser(user);
    fetchStateData(token);
    if (user.role === 'UCP Member') {
      navigate('/booking');
    } else {
      navigate('/staff/dashboard');
    }
  };

  // --- CONTROLLER HANDLERS ---

  const handleApproveBooking = async (bookingId: string) => {
    const response = await fetch(`/api/bookings/${bookingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to approve booking');
    }
    await fetchStateData();
  };

  const handleRejectBooking = async (bookingId: string, reason: string) => {
    const response = await fetch(`/api/bookings/${bookingId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ reason })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to reject booking');
    }
    await fetchStateData();
  };

  const handleOverrideBooking = async (bookingId: string, updateData: any) => {
    const response = await fetch(`/api/bookings/${bookingId}/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(updateData)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to override booking');
    }
    await fetchStateData();
  };

  const handleCreateRole = async (roleData: any) => {
    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(roleData)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create custom role');
    }
    await fetchStateData();
  };

  const handleDeleteRole = async (roleName: string) => {
    const response = await fetch(`/api/roles/${roleName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete custom role');
    }
    await fetchStateData();
  };

  const handleAssignUserRole = async (email: string, role: string) => {
    const response = await fetch('/api/users/assign-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ email, role })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to assign user role');
    }
    await fetchStateData();
  };

  const handleCreateUser = async (userData: any) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(userData)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to register simulated user');
    }
    await fetchStateData();
  };

  const handleAddRoom = async (roomData: any) => {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(roomData)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to register room');
    }
    await fetchStateData();
  };

  const handleUpdateRoom = async (roomId: string, updateData: any) => {
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(updateData)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update room');
    }
    await fetchStateData();
  };

  const handleIssueBan = async (banData: any) => {
    const response = await fetch('/api/bans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(banData)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to register ban');
    }
    await fetchStateData();
  };

  const handleLiftBan = async (banId: string, reason: string) => {
    const response = await fetch(`/api/bans/${banId}/lift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ reason })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to lift ban early');
    }
    await fetchStateData();
  };

  const handleQuickBanRedirection = (email: string, name: string) => {
    setActiveTab('governance');
    navigate('/staff/dashboard');
    setTimeout(() => {
      alert(`Account '${email}' prefilled trigger. Under the 'Blacklist & Bans' subtab in Governance Center, insert email to restrict.`);
    }, 150);
  };

  // Helper check for active permission node
  const hasPermission = (permissionNode: string): boolean => {
    if (activeUser.role === 'Administrator') return true;
    const roleRecord = roles.find(r => r.name === activeUser.role);
    if (!roleRecord) return false;
    return roleRecord.permissions.includes(permissionNode);
  };

  // RENDER DYNAMIC SPA ROUTING SWITCH
  const renderRouteContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-24 bg-[#FFFFFF]">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-medium mt-3">Synchronizing active environment...</p>
        </div>
      );
    }

    switch (currentPath) {
      case '/':
        return <LandingPage onNavigate={navigate} activeUser={activeUser} />;
        
      case '/login':
        return (
          <LoginPage 
            onNavigate={navigate} 
            onLoginSuccess={handleLoginSuccess} 
            simulatedUsers={simulatedIdentities} 
            isStaff={false} 
          />
        );
        
      case '/staff/login':
        return (
          <LoginPage 
            onNavigate={navigate} 
            onLoginSuccess={handleLoginSuccess} 
            simulatedUsers={simulatedIdentities} 
            isStaff={true} 
          />
        );

      case '/booking':
        return (
          <div className="flex-1 flex flex-col min-h-0 bg-[#FFFFFF]">
            <header className="bg-[#FFFFFF] border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-3xs">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-white text-base font-black tracking-widest font-mono">T</span>
                </div>
                <div>
                  <h1 className="text-sm font-black text-primary uppercase tracking-wider">Takhleeq public scheduler</h1>
                  <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">University of Central Punjab</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#F8F5F0] p-1 rounded-xl border border-gray-150">
                <button
                  onClick={() => navigate('/booking')}
                  className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold bg-primary text-white shadow-3xs cursor-pointer uppercase tracking-wider"
                >
                  Book Space
                </button>
                <button
                  onClick={() => navigate('/track')}
                  className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold text-gray-600 hover:text-gray-950 cursor-pointer uppercase tracking-wider"
                >
                  Track booking
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{activeUser.name.split(' (')[0]}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg cursor-pointer transition-all"
                  title="Sign out profile"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </header>

            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
              <BookingFormPage 
                rooms={rooms}
                selectedUserEmail={activeUser.email}
                onBookingSubmitted={fetchStateData}
                onNavigate={navigate}
              />
            </main>
          </div>
        );

      case '/track':
        return (
          <div className="flex-1 flex flex-col min-h-0 bg-[#FFFFFF]">
            <header className="bg-[#FFFFFF] border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-3xs">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-white text-base font-black tracking-widest font-mono">T</span>
                </div>
                <div>
                  <h1 className="text-sm font-black text-primary uppercase tracking-wider">Takhleeq public scheduler</h1>
                  <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">University of Central Punjab</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#F8F5F0] p-1 rounded-xl border border-gray-150">
                <button
                  onClick={() => navigate('/booking')}
                  className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold text-gray-600 hover:text-gray-950 cursor-pointer uppercase tracking-wider"
                >
                  Book Space
                </button>
                <button
                  onClick={() => navigate('/track')}
                  className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold bg-primary text-white shadow-3xs cursor-pointer uppercase tracking-wider"
                >
                  Track booking
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{activeUser.name.split(' (')[0]}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg cursor-pointer transition-all"
                  title="Sign out profile"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </header>

            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
              <TrackPage 
                bookings={bookings}
                currentUserEmail={activeUser.email}
                onRefresh={fetchStateData}
                onNavigate={navigate}
              />
            </main>
          </div>
        );

      case '/staff/dashboard':
        return (
          <div className="flex-1 flex overflow-hidden bg-gray-50/50" id="staff-dashboard-page">
            
            {/* Desktop Left Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0">
              <div className="p-5 border-b border-gray-100 bg-gray-50/20">
                <div className="flex items-center gap-2.5 cursor-pointer mb-5" onClick={() => navigate('/')}>
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white text-xs font-black font-mono">T</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900">Takhleeq ERP Portal</span>
                </div>

                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Signed Back-office</p>
                <div className="mt-2.5 flex items-start gap-2.5">
                  <div className="h-8.5 w-8.5 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
                    <Shield className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-gray-800 truncate leading-tight">{activeUser.name.split(' (')[0]}</h3>
                    <p className="text-[10px] text-primary font-bold mt-0.5">{activeUser.role}</p>
                  </div>
                </div>
              </div>

              {/* Sidebar Navigation */}
              <nav className="flex-1 p-4 space-y-1">
                <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2.5">Operations</h2>
                
                <button
                  onClick={() => setActiveTab('queue')}
                  disabled={!hasPermission('VIEW_PENDING_QUEUE')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'queue' 
                      ? 'bg-primary text-white shadow-3xs' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center gap-3">
                    <ShieldAlert className="h-4 w-4" />
                    Review Queue
                  </span>
                  {!hasPermission('VIEW_PENDING_QUEUE') && <Lock className="h-3 w-3 text-gray-400 animate-pulse" />}
                </button>

                <button
                  onClick={() => setActiveTab('register')}
                  disabled={!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'register' 
                      ? 'bg-primary text-white shadow-3xs' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center gap-3">
                    <Activity className="h-4 w-4" />
                    Booking Register
                  </span>
                  {!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE') && <Lock className="h-3 w-3 text-gray-400 animate-pulse" />}
                </button>

                <div className="pt-4 border-t border-gray-100 my-4" />
                <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2.5">Administration</h2>

                <button
                  onClick={() => setActiveTab('governance')}
                  disabled={activeUser.role !== 'Administrator'}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'governance' 
                      ? 'bg-primary text-white shadow-3xs' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center gap-3">
                    <Settings className="h-4 w-4" />
                    Governance Center
                  </span>
                  {activeUser.role !== 'Administrator' && <Lock className="h-3 w-3 text-gray-400" />}
                </button>

                <button
                  onClick={() => setActiveTab('rooms')}
                  disabled={activeUser.role !== 'Administrator'}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'rooms' 
                      ? 'bg-primary text-white shadow-3xs' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center gap-3">
                    <Building className="h-4 w-4" />
                    Room Management
                  </span>
                  {activeUser.role !== 'Administrator' && <Lock className="h-3 w-3 text-gray-400" />}
                </button>

                <button
                  onClick={() => setActiveTab('audits')}
                  disabled={activeUser.role !== 'Administrator'}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'audits' 
                      ? 'bg-primary text-white shadow-3xs' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center gap-3">
                    <Database className="h-4 w-4" />
                    Audit Logs
                  </span>
                  {activeUser.role !== 'Administrator' && <Lock className="h-3 w-3 text-gray-400" />}
                </button>
              </nav>

              <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] text-gray-400 font-bold">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> AD Sync Active
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <LogOut className="h-3.5 w-3.5" /> Out
                </button>
              </div>
            </aside>

            {/* Staff Right Main workspace Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#8B1A1A] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                    Takhleeq Backoffice Console
                  </span>
                  <span className="h-4 w-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {activeTab === 'queue' 
                      ? 'Operational Pending Reviews' 
                      : activeTab === 'register' 
                      ? 'Schedules & CSV Snapper' 
                      : activeTab === 'governance' 
                      ? 'Custom Role Compiler' 
                      : activeTab === 'rooms' 
                      ? 'Facility Spaces configurator' 
                      : 'Security Audit Ledger logs'}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:hidden">
                  <button 
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 text-gray-500 hover:text-gray-950 rounded-lg cursor-pointer border border-gray-150 bg-gray-50"
                  >
                    {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </header>

              {/* Mobile hamburger panel inside dashboard */}
              <AnimatePresence>
                {mobileMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="md:hidden fixed inset-0 z-40 bg-white flex flex-col p-6 space-y-6 text-left"
                  >
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="font-extrabold text-primary uppercase text-sm">Dashboard Nav</span>
                      <button onClick={() => setMobileMenuOpen(false)} className="text-gray-500 text-lg">✕</button>
                    </div>

                    <div className="flex-1 space-y-3.5 overflow-y-auto">
                      <button 
                        onClick={() => { setActiveTab('queue'); setMobileMenuOpen(false); }}
                        disabled={!hasPermission('VIEW_PENDING_QUEUE')}
                        className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'queue' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                      >
                        Review Queue
                      </button>
                      <button 
                        onClick={() => { setActiveTab('register'); setMobileMenuOpen(false); }}
                        disabled={!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE')}
                        className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'register' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                      >
                        Booking Register
                      </button>
                      <button 
                        onClick={() => { setActiveTab('governance'); setMobileMenuOpen(false); }}
                        disabled={activeUser.role !== 'Administrator'}
                        className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'governance' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                      >
                        Governance Center
                      </button>
                      <button 
                        onClick={() => { setActiveTab('rooms'); setMobileMenuOpen(false); }}
                        disabled={activeUser.role !== 'Administrator'}
                        className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'rooms' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                      >
                        Room Management
                      </button>
                      <button 
                        onClick={() => { setActiveTab('audits'); setMobileMenuOpen(false); }}
                        disabled={activeUser.role !== 'Administrator'}
                        className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'audits' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                      >
                        Audit Logs
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main inner workspace container with overflow scroll */}
              <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {activeTab === 'queue' && (
                      <StaffReviewQueue 
                        bookings={bookings}
                        activeBans={bans}
                        onApprove={handleApproveBooking}
                        onReject={handleRejectBooking}
                        onIssueBanClick={handleQuickBanRedirection}
                        onRefresh={fetchStateData}
                      />
                    )}

                    {activeTab === 'register' && (
                      <BookingCalendarDashboard 
                        bookings={bookings}
                        rooms={rooms}
                        activeBans={bans}
                        onRefresh={fetchStateData}
                        onApprove={handleApproveBooking}
                        onReject={handleRejectBooking}
                        onOverride={handleOverrideBooking}
                      />
                    )}

                    {activeTab === 'governance' && (
                      <GovernanceCenterPage 
                        roles={roles}
                        users={users}
                        activeBans={bans}
                        currentUser={activeUser}
                        onRefresh={fetchStateData}
                        onCreateRole={handleCreateRole}
                        onDeleteRole={handleDeleteRole}
                        onAssignRole={handleAssignUserRole}
                        onCreateUser={handleCreateUser}
                        onIssueBan={handleIssueBan}
                        onLiftBan={handleLiftBan}
                      />
                    )}

                    {activeTab === 'rooms' && (
                      <RoomManagementPage 
                        rooms={rooms}
                        onRefresh={fetchStateData}
                        onAddRoom={handleAddRoom}
                        onUpdateRoom={handleUpdateRoom}
                      />
                    )}

                    {activeTab === 'audits' && (
                      <AuditLogsPage 
                        auditLogs={auditLogs}
                        onRefresh={fetchStateData}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-24 text-center bg-white max-w-md mx-auto rounded-2xl border border-gray-100 shadow-3xs p-6 mt-12 text-xs text-gray-500 leading-relaxed">
            <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto mb-2" />
            <p className="font-extrabold text-gray-800 uppercase tracking-wide">404: Endpoint Route Not Found</p>
            <p className="mt-1">The requested URL block is not active in this sandbox. Please go back to safety.</p>
            <button 
              onClick={() => navigate('/')} 
              className="mt-4 bg-primary text-white font-bold py-2 px-5 rounded-xl uppercase tracking-wider text-[10px] cursor-pointer"
            >
              Go to Landing Page
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-[#1A1A1A]" id="takhleeq-erp-application">
      
      {/* ENTERPRISE SIMULATION BAR - IMMUTABLE ON ALL PAGES TO ENABLE SPEED TESTING */}
      <section className="bg-[#121214] text-gray-300 border-b border-gray-800 py-2.5 px-4 flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0 shadow-sm text-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[11px] font-bold tracking-wider uppercase text-gray-400">
            Interactive Portal Switcher & Microsoft SSO Sandbox
          </p>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap font-bold">
          {/* Public / Staff Domain Buttons */}
          <div className="bg-[#1F1F23] border border-gray-700/60 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => { navigate('/'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                currentPath === '/'
                  ? 'bg-primary text-white shadow-3xs'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => { navigate('/booking'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                currentPath === '/booking' || currentPath === '/track'
                  ? 'bg-primary text-white shadow-3xs'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Public booking
            </button>
            <button
              onClick={() => { navigate('/staff/dashboard'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                currentPath === '/staff/dashboard'
                  ? 'bg-primary text-white shadow-3xs'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Staff Back-office ERP
            </button>
          </div>

          <div className="h-4 w-px bg-gray-800 hidden md:block" />

          {/* Active Persona selection */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase font-black">Impersonate Profile:</span>
            <select 
              value={activeUser.email}
              onChange={(e) => handleActiveIdentityChange(e.target.value)}
              className="bg-[#1F1F23] border border-gray-700/60 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer hover:bg-gray-800 font-bold"
            >
              {simulatedIdentities.map(id => (
                <option key={id.email} value={id.email}>
                  {id.name} ({id.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* RENDER CURRENT PAGE */}
      {renderRouteContent()}

    </div>
  );
}
