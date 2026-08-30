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
import { StaffReviewQueue } from './features/admin/pages/StaffReviewQueue';
import { BookingCalendarDashboard } from './features/admin/pages/BookingCalendarDashboard';
import { GovernanceCenterPage } from './features/admin/pages/GovernanceCenter';
import { RoomManagementPage } from './features/admin/pages/RoomManagement';
import { BookingTypesPage } from './features/admin/pages/BookingTypes';
import { OperationalAnalyticsPage } from './features/admin/pages/OperationalAnalytics';
import { AuditLogsPage } from './features/admin/pages/AuditLogs';
import { PublicCohortApplyPage } from './features/cohort/pages/PublicCohortApplyPage';
import { PublicCohortTrackPage } from './features/cohort/pages/PublicCohortTrackPage';
import { CohortFounderDashboardPage } from './features/cohort/pages/CohortFounderDashboardPage';
import { CohortManagementPage } from './features/admin/pages/CohortManagement/CohortManagementPage';
import { PublicRoomDisplayPage } from './features/booking/pages/PublicRoomDisplayPage';


// Services
import { bookingsApi } from './features/booking/services/bookings.api';
import { roomsApi } from './features/admin/services/rooms.api';
import { rolesApi } from './features/admin/services/roles.api';
import { bansApi } from './features/admin/services/bans.api';
import { usersApi } from './features/admin/services/users.api';
import { auditApi } from './features/admin/services/audit.api';
import { authApi } from './features/auth/services/auth.api';
import { setClientToken } from './shared/apiClient';

// Types
import { Room, Booking, Ban, CustomRole, User as ERPUser, AuditRecord, Cohort } from './types';

export default function App() {
  // Real path-based URL state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (window.location.pathname + window.location.search + window.location.hash) || '/';
    }
    return '/';
  });

  // Current tab for staff back-office (/staff/dashboard)
  // Options: 'queue' | 'register' | 'governance' | 'rooms' | 'audits'
  const [activeTab, setActiveTab] = useState<string>('queue');

  const [activeUser, setActiveUser] = useState<ERPUser | null>(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { return null; }
    }
    return null;
  });
  const [globalBannedError, setGlobalBannedError] = useState<string | null>(null);

  // Core synchronized database states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [users, setUsers] = useState<ERPUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [reportsData, setReportsData] = useState<any>(null);

  const [jwtToken, setJwtToken] = useState<string | null>(() => {
    return localStorage.getItem('jwtToken');
  });
  const [loading, setLoading] = useState(true);

  // Cohort context state
  const [cohortsList, setCohortsList] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);

  // Custom multi-route navigation handler
  const navigate = (path: string, tab?: string) => {
    if (tab) {
      setActiveTab(tab);
    }
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Sync back & forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath((window.location.pathname + window.location.search + window.location.hash) || '/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch all state tables from Express server
  const fetchStateData = async (token?: any) => {
    const currentToken = (typeof token === 'string' && token) ? token : jwtToken;
    if (!currentToken) return;

    try {
      // 1. Fetch public / common tables (rooms and bookings)
      const [roomsData, bookingsData] = await Promise.all([
        roomsApi.getAll(currentToken).catch(() => []),
        bookingsApi.getAll(currentToken).catch(() => [])
      ]);

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);

      // 2. Determine effective user
      const storedUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('currentUser') : null;
      let effectiveUser = activeUser;
      if (!effectiveUser && storedUserStr) {
        try { effectiveUser = JSON.parse(storedUserStr); } catch (e) {}
      }

      const isStaffOrAdmin = effectiveUser && effectiveUser.role !== 'UCP Member' && effectiveUser.role !== 'Cohort Founder';

      if (isStaffOrAdmin) {
        const [bansData, rolesData, usersData] = await Promise.all([
          bansApi.getAll(currentToken).catch(() => []),
          rolesApi.getAll(currentToken).catch(() => []),
          usersApi.getAll(currentToken).catch(() => [])
        ]);

        setBans(Array.isArray(bansData) ? bansData : []);
        setRoles(Array.isArray(rolesData) ? rolesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);

        // Synchronize activeUser with the latest role and permissions from backend if changed
        if (effectiveUser && Array.isArray(usersData) && Array.isArray(rolesData)) {
          const freshUserRecord = usersData.find(u => u.email.toLowerCase() === effectiveUser.email.toLowerCase());
          if (freshUserRecord) {
            const freshRoleRecord = rolesData.find(r => r.name === freshUserRecord.role);
            const freshPermissions = freshRoleRecord ? freshRoleRecord.permissions : [];
            
            if (effectiveUser.role !== freshUserRecord.role || 
                JSON.stringify(effectiveUser.permissions) !== JSON.stringify(freshPermissions) ||
                effectiveUser.status !== freshUserRecord.status) {
              const updatedUser = {
                ...effectiveUser,
                role: freshUserRecord.role,
                status: freshUserRecord.status,
                permissions: freshPermissions
              };
              setActiveUser(updatedUser);
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
          }
        }

        // Admin or users with specific permission nodes can fetch logs & report data
        const userHasAuditView = effectiveUser?.role === 'Administrator' || 
          (effectiveUser?.permissions && (
            effectiveUser.permissions.includes('VIEW_AUDIT_LOGS') || 
            effectiveUser.permissions.includes('EXPORT_AUDIT_LOGS') || 
            effectiveUser.permissions.includes('VIEW_ANALYTICS_DASHBOARD')
          )) || 
          (Array.isArray(rolesData) && rolesData.find(r => r.name === effectiveUser?.role)?.permissions.some(p => 
            ['VIEW_AUDIT_LOGS', 'EXPORT_AUDIT_LOGS', 'VIEW_ANALYTICS_DASHBOARD'].includes(p)
          ));

        if (userHasAuditView) {
          const [auditData, repData] = await Promise.all([
            auditApi.getLogs(currentToken).catch(() => []),
            auditApi.getReports(currentToken).catch(() => null)
          ]);
          setAuditLogs(Array.isArray(auditData) ? auditData : []);
          setReportsData(repData);
        }
      }

      // Fetch Cohorts safely
      fetch('/api/cohorts', { headers: { 'Authorization': `Bearer ${currentToken}` } })
        .then(res => {
          if (!res.ok) return [];
          return res.json();
        })
        .then(cData => {
          if (Array.isArray(cData)) {
            setCohortsList(cData);
            if (cData.length > 0 && !selectedCohortId) {
              const active = cData.find((c: any) => c.status === 'ACTIVE') || cData[cData.length - 1];
              if (active) setSelectedCohortId(active.id);
            }
          }
        })
        .catch(() => {});

      setLoading(false);
    } catch (err) {
      console.error('Error fetching ERP database tables', err);
      setLoading(false);
    }
  };

  // Initialize session on boot from localStorage
  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      setClientToken(null);
      setJwtToken(null);
      setActiveUser(null);
      setGlobalBannedError(null);
      navigate('/login');
    };
    window.addEventListener('auth:session_expired', handleSessionExpired);

    const initAuth = async () => {
      const storedToken = localStorage.getItem('jwtToken') || localStorage.getItem('token');
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setActiveUser(parsed);
        } catch (e) {}
      }
      if (storedToken) {
        try {
          setClientToken(storedToken);
          localStorage.setItem('jwtToken', storedToken);
          localStorage.setItem('token', storedToken);
          await fetchStateData(storedToken);
        } catch (err) {
          console.error('Session initialization error:', err);
        }
      }
      setLoading(false);
    };
    initAuth();

    return () => window.removeEventListener('auth:session_expired', handleSessionExpired);
  }, []);

  // Auto-refresh the back-office queue or calendar when on the staff dashboard
  useEffect(() => {
    if (currentPath !== '/staff/dashboard' || !jwtToken) return;

    // Fetch fresh database tables every 15 seconds to keep the review queue auto-updated smoothly
    const interval = setInterval(() => {
      fetchStateData();
    }, 15000);

    return () => clearInterval(interval);
  }, [currentPath, jwtToken]);

  // Logout routine
  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setClientToken(null);
    setJwtToken(null);
    setActiveUser(null);
    setGlobalBannedError(null);
    navigate('/login');
  };

  // SSO / Password Login callback
  const handleLoginSuccess = (token: string, user: ERPUser) => {
    localStorage.setItem('jwtToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setClientToken(token);
    setJwtToken(token);
    setActiveUser(user);
    fetchStateData(token);
    if (user.role === 'Cohort Founder') {
      navigate('/founder-dashboard');
    } else if (user.role === 'UCP Member') {
      navigate('/booking');
    } else {
      navigate('/staff/dashboard');
    }
  };

  // --- CONTROLLER HANDLERS ---

  const handleApproveBooking = async (bookingId: string) => {
    // Optimistic UI Update: immediately mark as approved locally
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'APPROVED' } : b));
    try {
      await bookingsApi.approve(bookingId, jwtToken);
    } catch (err) {
      console.error('Approval failed:', err);
      await fetchStateData();
      throw err;
    }
    await fetchStateData();
  };

  const handleRejectBooking = async (bookingId: string, reason: string) => {
    // Optimistic UI Update: immediately mark as rejected locally
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'REJECTED BY STAFF' } : b));
    try {
      await bookingsApi.reject(bookingId, reason, jwtToken);
    } catch (err) {
      console.error('Rejection failed:', err);
      await fetchStateData();
      throw err;
    }
    await fetchStateData();
  };

  const handleOverrideBooking = async (bookingId: string, updateData: any) => {
    // Optimistic UI Update: apply updates locally immediately
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updateData } : b));
    try {
      await bookingsApi.override(bookingId, updateData, jwtToken);
    } catch (err) {
      console.error('Override failed:', err);
      await fetchStateData();
      throw err;
    }
    await fetchStateData();
  };

  const handleCreateRole = async (roleData: any) => {
    await rolesApi.create(roleData, jwtToken);
    await fetchStateData();
  };

  const handleUpdateRole = async (roleName: string, roleData: any) => {
    await rolesApi.update(roleName, roleData, jwtToken);
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
    // Optimistic UI Update: apply updates locally immediately to prevent lag/jitter
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updateData } : r));
    try {
      await roomsApi.update(roomId, updateData, jwtToken);
    } catch (err) {
      console.error('Update room failed:', err);
      // Revert if failed
      await fetchStateData();
      throw err;
    }
    await fetchStateData();
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await roomsApi.delete(roomId, jwtToken);
    } catch (err) {
      console.error('Delete room failed:', err);
      throw err;
    }
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
    if (!activeUser) return false;
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

    const normalizedPath = currentPath.split('?')[0].split('#')[0];

    if (normalizedPath.startsWith('/admissions/applications')) {
      if (!jwtToken || !activeUser) {
        return (
          <LoginPage 
            onNavigate={navigate} 
            onLoginSuccess={handleLoginSuccess} 
            isStaff={true} 
            simulatedUsers={users}
          />
        );
      }
      return (
        <StaffLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeUser={activeUser}
          hasPermission={hasPermission}
          onNavigate={navigate}
          onLogout={handleLogout}
          jwtToken={jwtToken}
          cohortsList={cohortsList}
          selectedCohortId={selectedCohortId}
          setSelectedCohortId={setSelectedCohortId}
          currentPath={currentPath}
        >
          <CohortManagementPage 
            currentUser={activeUser}
            hasPermission={hasPermission}
            onRefresh={fetchStateData}
            jwtToken={jwtToken}
            activeTab="cohort_intake"
            selectedCohortId={selectedCohortId}
            setSelectedCohortId={setSelectedCohortId}
            cohortsList={cohortsList}
            auditLogs={auditLogs}
            currentPath={currentPath}
            onNavigate={navigate}
          />
        </StaffLayout>
      );
    }

    if (normalizedPath.startsWith('/admin/checkins')) {
      if (!jwtToken || !activeUser) {
        return (
          <LoginPage 
            onNavigate={navigate} 
            onLoginSuccess={handleLoginSuccess} 
            isStaff={true} 
            simulatedUsers={users}
          />
        );
      }
      return (
        <StaffLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeUser={activeUser}
          hasPermission={hasPermission}
          onNavigate={navigate}
          onLogout={handleLogout}
          jwtToken={jwtToken}
          cohortsList={cohortsList}
          selectedCohortId={selectedCohortId}
          setSelectedCohortId={setSelectedCohortId}
          currentPath={currentPath}
        >
          <CohortManagementPage 
            currentUser={activeUser}
            hasPermission={hasPermission}
            onRefresh={fetchStateData}
            jwtToken={jwtToken}
            activeTab="cohort_startups"
            selectedCohortId={selectedCohortId}
            setSelectedCohortId={setSelectedCohortId}
            cohortsList={cohortsList}
            auditLogs={auditLogs}
            currentPath={currentPath}
            onNavigate={navigate}
          />
        </StaffLayout>
      );
    }

    if (normalizedPath.startsWith('/admin/sessions')) {
      if (!jwtToken || !activeUser) {
        return (
          <LoginPage 
            onNavigate={navigate} 
            onLoginSuccess={handleLoginSuccess} 
            isStaff={true} 
            simulatedUsers={users}
          />
        );
      }
      return (
        <StaffLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeUser={activeUser}
          hasPermission={hasPermission}
          onNavigate={navigate}
          onLogout={handleLogout}
          jwtToken={jwtToken}
          cohortsList={cohortsList}
          selectedCohortId={selectedCohortId}
          setSelectedCohortId={setSelectedCohortId}
          currentPath={currentPath}
        >
          <CohortManagementPage 
            currentUser={activeUser}
            hasPermission={hasPermission}
            onRefresh={fetchStateData}
            jwtToken={jwtToken}
            activeTab="cohort_sessions"
            selectedCohortId={selectedCohortId}
            setSelectedCohortId={setSelectedCohortId}
            cohortsList={cohortsList}
            auditLogs={auditLogs}
            currentPath={currentPath}
            onNavigate={navigate}
          />
        </StaffLayout>
      );
    }

    switch (normalizedPath) {
      case '/':
        return <LandingPage onNavigate={navigate} activeUser={activeUser} />;
        
      case '/login':
        return (
          <LoginPage 
            onNavigate={navigate} 
            onLoginSuccess={handleLoginSuccess} 
            isStaff={false} 
            simulatedUsers={users}
          />
        );
        
      case '/staff/login':
        return (
          <LoginPage 
            onNavigate={navigate} 
            onLoginSuccess={handleLoginSuccess} 
            isStaff={true} 
            simulatedUsers={users}
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
              selectedUserEmail={activeUser?.email || ''}
              activeUser={activeUser}
              jwtToken={jwtToken}
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
              currentUserEmail={activeUser?.email || ''}
              jwtToken={jwtToken}
              currentPath={currentPath}
              onRefresh={fetchStateData}
              onNavigate={navigate}
            />
          </PublicLayout>
        );

      case '/room-display':
      case '/display':
        return (
          <PublicRoomDisplayPage
            rooms={rooms}
            bookings={bookings}
            onRefresh={fetchStateData}
            onNavigate={navigate}
          />
        );

      case '/cohort-apply':
        return (
          <PublicLayout
            currentPath={currentPath}
            activeUser={activeUser}
            onNavigate={navigate}
            onLogout={handleLogout}
          >
            <PublicCohortApplyPage onNavigate={navigate} />
          </PublicLayout>
        );

      case '/cohort-track':
        return (
          <PublicLayout
            currentPath={currentPath}
            activeUser={activeUser}
            onNavigate={navigate}
            onLogout={handleLogout}
          >
            <PublicCohortTrackPage currentPath={currentPath} onNavigate={navigate} />
          </PublicLayout>
        );

      case '/founder-dashboard':
        if (!jwtToken || !activeUser) {
          return (
            <LoginPage 
              onNavigate={navigate} 
              onLoginSuccess={handleLoginSuccess} 
              isStaff={false} 
              simulatedUsers={users}
            />
          );
        }
        return (
          <PublicLayout
            currentPath={currentPath}
            activeUser={activeUser}
            onNavigate={navigate}
            onLogout={handleLogout}
          >
            <CohortFounderDashboardPage 
              jwtToken={jwtToken} 
              onNavigate={navigate} 
            />
          </PublicLayout>
        );

      case '/staff/dashboard':
        if (!jwtToken || !activeUser) {
          return (
            <LoginPage 
              onNavigate={navigate} 
              onLoginSuccess={handleLoginSuccess} 
              isStaff={true} 
              simulatedUsers={users}
            />
          );
        }
        return (
          <StaffLayout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeUser={activeUser}
            hasPermission={hasPermission}
            onNavigate={navigate}
            onLogout={handleLogout}
            jwtToken={jwtToken}
            cohortsList={cohortsList}
            selectedCohortId={selectedCohortId}
            setSelectedCohortId={setSelectedCohortId}
            currentPath={currentPath}
          >
            {activeTab === 'queue' && (
              <StaffReviewQueue 
                bookings={bookings}
                activeBans={bans}
                onApprove={handleApproveBooking}
                onReject={handleRejectBooking}
                onIssueBanClick={handleQuickBanRedirection}
                onRefresh={fetchStateData}
                hasPermission={hasPermission}
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
                hasPermission={hasPermission}
              />
            )}

            {activeTab === 'governance' && (
              <GovernanceCenterPage 
                roles={roles}
                users={users}
                bookings={bookings}
                activeBans={bans}
                currentUser={activeUser}
                hasPermission={hasPermission}
                onRefresh={fetchStateData}
                onCreateRole={handleCreateRole}
                onUpdateRole={handleUpdateRole}
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
                onDeleteRoom={handleDeleteRoom}
              />
            )}

            {(activeTab === 'booking_types' || activeTab === 'types') && (
              <BookingTypesPage 
                onRefresh={fetchStateData}
              />
            )}

            {(activeTab === 'booking_analytics' || activeTab === 'analytics') && (
              <OperationalAnalyticsPage 
                bookings={bookings}
                rooms={rooms}
              />
            )}

            {activeTab === 'audits' && (
              <AuditLogsPage 
                auditLogs={auditLogs}
                reportsData={reportsData}
                onRefresh={fetchStateData}
                hasPermission={hasPermission}
                bookings={bookings}
                rooms={rooms}
                activeBans={bans}
              />
            )}

            {(activeTab.startsWith('cohort') || activeTab === 'builder' || currentPath.startsWith('/admissions/applications') || currentPath.startsWith('/admin/checkins') || currentPath.startsWith('/admin/sessions')) && (
              <CohortManagementPage 
                currentUser={activeUser}
                hasPermission={hasPermission}
                onRefresh={fetchStateData}
                jwtToken={jwtToken}
                activeTab={activeTab}
                selectedCohortId={selectedCohortId}
                setSelectedCohortId={setSelectedCohortId}
                cohortsList={cohortsList}
                auditLogs={auditLogs}
                currentPath={currentPath}
                onNavigate={navigate}
              />
            )}
          </StaffLayout>
        );

      default:
        return (
          <div className="py-24 text-center bg-white max-w-md mx-auto rounded-2xl border border-gray-100 shadow-3xs p-6 mt-12 text-xs text-gray-500 leading-relaxed">
            <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto mb-2" />
            <p className="font-extrabold text-gray-800 uppercase tracking-wide">404: Endpoint Route Not Found</p>
            <p className="mt-1">The requested page or endpoint does not exist. Please return to safety.</p>
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



    </div>
  );
}
