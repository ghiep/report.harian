import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  CheckSquare,
  Calendar as CalendarIcon,
  Briefcase,
  BarChart3,
  FileText,
  Bot,
  Settings,
  LogOut,
  Sparkles,
  User as UserIcon,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavRoute =
  | 'dashboard'
  | 'today'
  | 'tasks'
  | 'calendar'
  | 'projects'
  | 'analytics'
  | 'reports'
  | 'ai-assistant'
  | 'settings';

interface SidebarProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  selectedProjectId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const navItems: { id: NavRoute; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'today', label: 'Today Focus', icon: <CalendarCheck className="w-5 h-5" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-5 h-5" /> },
    { id: 'projects', label: 'Projects', icon: <Briefcase className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports & Review', icon: <FileText className="w-5 h-5" /> },
    { id: 'ai-assistant', label: 'AI Assistant', icon: <Bot className="w-5 h-5" />, badge: 'AI' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleNav = (route: NavRoute) => {
    onRouteChange(route);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
              WorkFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-300 font-black">AI</span>
            </span>
            <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">Work & Productivity</p>
          </div>
        </div>

        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Core Workflow Tag */}
      <div className="px-5 py-2.5 bg-slate-800/40 border-b border-slate-800/50">
        <div className="text-[10px] font-medium text-slate-400 tracking-wider flex items-center justify-between">
          <span>WORKFLOW CYCLE</span>
          <span className="text-indigo-400 text-[9px] uppercase font-semibold">Live System</span>
        </div>
        <p className="text-[11px] text-slate-300 font-mono mt-0.5 truncate">
          Capture → Prioritize → Execute
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </div>

        {navItems.map((item) => {
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90">
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ring-2 ring-slate-700">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Pengguna'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || 'user@workflow.ai'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Keluar / Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] flex-1 flex flex-col z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
