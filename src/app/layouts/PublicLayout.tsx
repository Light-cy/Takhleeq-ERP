import React from 'react';
import { User, LogOut } from 'lucide-react';
import { User as ERPUser } from '../../types';

interface PublicLayoutProps {
  currentPath: string;
  activeUser: ERPUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  currentPath,
  activeUser,
  onNavigate,
  onLogout,
  children
}) => {
  const isCohortPath = currentPath.includes('cohort') || currentPath.includes('founder-dashboard');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#FFFFFF]">
      <header className="bg-[#FFFFFF] border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-3xs">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white text-base font-black tracking-widest font-mono">
              {isCohortPath ? 'C' : 'T'}
            </span>
          </div>
          <div>
            <h1 className="text-sm font-black text-primary uppercase tracking-wider">
              {isCohortPath ? 'Takhleeq Cohort Portal' : 'Takhleeq public scheduler'}
            </h1>
            <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">
              {isCohortPath ? 'Incubation & Acceleration' : 'University of Central Punjab'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#F8F5F0] p-1 rounded-xl border border-gray-150">
          {isCohortPath ? (
            <>
              {currentPath !== '/founder-dashboard' && (
                <>
                  <button
                    onClick={() => onNavigate('/cohort-apply')}
                    className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider cursor-pointer ${
                      currentPath === '/cohort-apply'
                        ? 'bg-primary text-white shadow-3xs'
                        : 'text-gray-600 hover:text-gray-950'
                    }`}
                  >
                    Apply Now
                  </button>
                  <button
                    onClick={() => onNavigate('/cohort-track')}
                    className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider cursor-pointer ${
                      currentPath === '/cohort-track'
                        ? 'bg-primary text-white shadow-3xs'
                        : 'text-gray-600 hover:text-gray-950'
                    }`}
                  >
                    Track Status
                  </button>
                </>
              )}
              {currentPath === '/founder-dashboard' && (
                <button
                  onClick={() => onNavigate('/founder-dashboard')}
                  className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider cursor-pointer bg-primary text-white shadow-3xs"
                >
                  Founder Portal
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate('/booking')}
                className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider cursor-pointer ${
                  currentPath === '/booking'
                    ? 'bg-primary text-white shadow-3xs'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                Book Space
              </button>
              <button
                onClick={() => onNavigate('/track')}
                className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider cursor-pointer ${
                  currentPath === '/track'
                    ? 'bg-primary text-white shadow-3xs'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                Track booking
              </button>
              <button
                onClick={() => onNavigate('/room-display')}
                className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider cursor-pointer ${
                  currentPath === '/room-display' || currentPath === '/display'
                    ? 'bg-primary text-white shadow-3xs'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                Room TV Signage
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {activeUser ? (
            <>
              <div className="bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{activeUser.name ? activeUser.name.split(' (')[0] : activeUser.email}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg cursor-pointer transition-all"
                title="Sign out profile"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('/login')}
              className="bg-primary text-white font-bold px-4 py-1.5 rounded-lg text-xs uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
            >
              <User className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
