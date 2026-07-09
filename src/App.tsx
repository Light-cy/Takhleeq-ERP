import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

// Imported Layouts
import { PublicLayout } from './app/layouts/PublicLayout';
import { StaffLayout } from './app/layouts/StaffLayout';

// Imported Pages & Subcomponents from their new layered locations
import { LandingPage } from './features/booking/pages/LandingPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { BookingFormPage } from './features/booking/pages/BookingFormPage';
import { TrackPage } from './features/booking/pages/TrackPage';
import { StaffReviewQueue } from './features/admin/pages/StaffReviewQueuePage';
import { BookingCalendarDashboard } from './features/admin/pages/BookingCalendarDashboard';
import { GovernanceCenterPage } from './features/admin/pages/GovernanceCenterPage';
import { RoomManagementPage } from './features/admin/pages/RoomManagementPage';
import { AuditLogsPage } from './features/admin/pages/AuditLogsPage';
import { Chatbot } from './components/Chatbot';

// Services
import { bookingsApi } from './features/booking/services/bookings.api';
import { roomsApi } from './features/admin/services/rooms.api';
import { rolesApi } from './features/admin/services/roles.api';
import { bansApi } from './features/admin/services/bans.api';
import { usersApi } from './features/admin/services/users.api';
import { auditApi } from './features/admin/services/audit.api';
import { authApi } from './features/auth/services/auth.api';

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

  // Simulated identities for testing complex roles & Microsoft SSO simulation
  const simulatedIdentities: ERPUser[] = [
    { email: 'usman@society.pk', name: 'Usman Ghani (Society Rep)', role: 'UCP Member', status: 'Active' },
    { email: 'faisal@ucp.edu.pk', name: 'Faisal Mehmood (Coordinator)', role: 'Facility Coordinator', status: 'Active' },
    { email: 'maheen@ucp.edu.pk', name: 'Maheen Malik (Manager)', role: 'Booking Manager', status: 'Active' },
    { email: 'director@takhleeq.pk', name: 'Dr. Qaseeb (Director)', role: 'Administrator', status: 'Active' },
    { email: 'banned-test@ucp.edu.pk', name: 'Banned Student (Testing)', role: 'UCP Member', status: 'Inactive' }
  ];

  const [activeUser, setActiveUser] = useState<ERPUser>(simulatedIdentities[3]); // Default to Administrator for easy testing
  const [globalBannedError, setGlobalBannedError] = useState<string | null>(null);

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
      const [roomsData, bookingsData, bansData, rolesData, usersData] = await Promise.all([
        roomsApi.getAll(currentToken).catch(() => []),
        bookingsApi.getAll(currentToken).catch(() => []),
        bansApi.getAll(currentToken).catch(() => []),
        rolesApi.getAll(currentToken).catch(() => []),
        usersApi.getAll(currentToken).catch(() => [])
      ]);

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setBans(Array.isArray(bansData) ? bansData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);

      // Admin role can fetch raw ledger logs
      if (activeUser?.role === 'Administrator') {
        const auditData = await auditApi.getLogs(currentToken).catch(() => []);
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
        const data = await authApi.loginSimulated(activeUser.email);
        setJwtToken(data.token);
        setActiveUser(data.user);
        await fetchStateData(data.token);
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
      setGlobalBannedError(null);
      try {
        const data = await authApi.loginSimulated(found.email);
        setJwtToken(data.token);
        setActiveUser(data.user);
        await fetchStateData(data.token);

        // Auto route to respective environments
        if (data.user.role === 'UCP Member') {
          navigate('/booking');
        } else {
          navigate('/staff/dashboard');
        }
      } catch (err: any) {
        console.error('Error switching identities via SSO:', err);
        if (err.message && err.message.includes('banned')) {
          setGlobalBannedError(err.message);
        } else {
          alert(err.message || 'Identity authentication failed.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Logout routine
  const handleLogout = () => {
    setJwtToken(null);
    setGlobalBannedError(null);
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
    await bookingsApi.approve(bookingId, jwtToken);
    await fetchStateData();
  };

  const handleRejectBooking = async (bookingId: string, reason: string) => {
    await bookingsApi.reject(bookingId, reason, jwtToken);
    await fetchStateData();
  };

  const handleOverrideBooking = async (bookingId: string, updateData: any) => {
    await bookingsApi.override(bookingId, updateData, jwtToken);
    await fetchStateData();
  };

  const handleCreateRole = async (roleData: any) => {
    await rolesApi.create(roleData, jwtToken);
    await fetchStateData();
  };

  const handleDeleteRole = async (roleName: string) => {
    await rolesApi.delete(roleName, jwtToken);
    await fetchStateData();
  };

  const handleAssignUserRole = async (email: string, role: string) => {
    await usersApi.assignRole(email, role, jwtToken);
    await fetchStateData();
  };

  const handleCreateUser = async (userData: any) => {
    await usersApi.create(userData, jwtToken);
    await fetchStateData();
  };

  const handleAddRoom = async (roomData: any) => {
    await roomsApi.add(roomData, jwtToken);
    await fetchStateData();
  };

  const handleUpdateRoom = async (roomId: string, updateData: any) => {
    await roomsApi.update(roomId, updateData, jwtToken);
    await fetchStateData();
  };

  const handleIssueBan = async (banData: any) => {
    await bansApi.issue(banData, jwtToken);
    await fetchStateData();
  };

  const handleLiftBan = async (banId: string, reason: string) => {
    await bansApi.lift(banId, reason, jwtToken);
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
    if (activeUser.permissions && activeUser.permissions.includes(permissionNode)) return true;
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
          <PublicLayout
            currentPath={currentPath}
            activeUser={activeUser}
            onNavigate={navigate}
            onLogout={handleLogout}
          >
            <BookingFormPage 
              rooms={rooms}
              selectedUserEmail={activeUser.email}
              onBookingSubmitted={fetchStateData}
              onNavigate={navigate}
            />
          </PublicLayout>
        );

      case '/track':
        return (
          <PublicLayout
            currentPath={currentPath}
            activeUser={activeUser}
            onNavigate={navigate}
            onLogout={handleLogout}
          >
            <TrackPage 
              bookings={bookings}
              currentUserEmail={activeUser.email}
              onRefresh={fetchStateData}
              onNavigate={navigate}
            />
          </PublicLayout>
        );

      case '/staff/dashboard':
        return (
          <StaffLayout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeUser={activeUser}
            hasPermission={hasPermission}
            onNavigate={navigate}
            onLogout={handleLogout}
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
          </StaffLayout>
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

      {/* DETECTED BAN MODAL */}
      {globalBannedError && (() => {
        const msg = globalBannedError;
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
        
        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="banned-overlay">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-red-100 flex flex-col">
              <div className="bg-primary px-6 py-8 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
                <div className="relative z-10 space-y-3">
                  <div className="h-14 w-14 rounded-full bg-white/15 border border-white/25 flex items-center justify-center mx-auto shadow-md text-white animate-pulse">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-wider uppercase">Access Restricted</h2>
                    <p className="text-[9px] text-white/80 font-mono uppercase tracking-widest mt-1">Security Protocol BR-09 Activated</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="p-4 bg-rose-50/50 border border-rose-100/60 rounded-2xl space-y-3.5 text-xs text-left">
                  <p className="text-[11px] text-rose-900 leading-relaxed font-semibold">
                    This account has been suspended from accessing Takhleeq ERP services.
                  </p>
                  
                  <div className="h-px bg-rose-100/50" />

                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Banned Account</span>
                      <span className="text-gray-800 font-extrabold font-mono text-[11px] break-all">{email}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Restriction Period</span>
                      <span className="text-rose-700 font-black uppercase text-[10px] bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-100 inline-block mt-0.5">{expiry}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Official Reason</span>
                      <p className="text-gray-700 font-bold italic bg-white p-3 rounded-xl border border-gray-150 text-[11px] leading-relaxed mt-1">
                        "{reason}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 text-center leading-normal">
                  If you believe this is an error, please file a written appeal with the Executive Director or contact the administrator.
                </div>

                <button
                  onClick={() => {
                    setGlobalBannedError(null);
                    handleLogout();
                  }}
                  className="w-full bg-primary hover:bg-[#5A0F0F] text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Sign Out & Reset Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FLOATING GEMINI CHATBOT ASSISTANT */}
      <Chatbot activeUser={activeUser} jwtToken={jwtToken} />

    </div>
  );
}
