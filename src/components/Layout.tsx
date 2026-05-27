import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { timeAgo } from '../data/mockData';
import {
  LayoutDashboard, Cpu, HardDrive, Network, ListTree, Terminal, FileText,
  Bell, Settings, HelpCircle, Moon, Sun, Menu, X, ChevronLeft,
  LogOut, Activity, Shield, AlertTriangle, Info, XCircle, Check, Zap
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cpu', label: 'CPU & Processes', icon: Cpu },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'network', label: 'Network & Ports', icon: Network },
  { id: 'processes', label: 'Process Manager', icon: ListTree },
  { id: 'scripts', label: 'Scripts & Cron', icon: Terminal },
  { id: 'files', label: 'File Monitor', icon: FileText },
  { id: 'alerts', label: 'Alert History', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Demo', icon: HelpCircle },
];

const severityIcon = {
  info: Info,
  warning: AlertTriangle,
  critical: XCircle,
};
const severityColor = {
  info: 'text-blue-400',
  warning: 'text-yellow-400',
  critical: 'text-red-400',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme, sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, alerts, acknowledgeAlert, logout, demoMode, settings } = useStore();
  const [alertDropdown, setAlertDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unackCount = alerts.filter(a => !a.acknowledged).length;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAlertDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 z-30`}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400" />
              <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">TermuxTracker</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {demoMode && sidebarOpen && (
          <div className="mx-3 mt-3 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 text-xs font-medium flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Demo Mode Active
          </div>
        )}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
                {item.id === 'alerts' && unackCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unackCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        {sidebarOpen && (
          <div className="p-3 border-t border-[var(--border-color)]">
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4 h-4" /> {settings.loginEnabled ? 'Logout' : 'Exit'}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold capitalize">{navItems.find(n => n.id === currentPage)?.label || 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" title="Toggle theme">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setAlertDropdown(!alertDropdown)} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors relative">
                <Bell className="w-5 h-5" />
                {unackCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold animate-pulse">
                    {unackCount}
                  </span>
                )}
              </button>
              {alertDropdown && (
                <div className="absolute right-0 top-12 w-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <button onClick={() => setAlertDropdown(false)} className="p-1 rounded hover:bg-[var(--bg-hover)]"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.filter(a => !a.acknowledged).length === 0 ? (
                      <div className="p-8 text-center text-[var(--text-muted)]">
                        <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p>All clear! No pending alerts.</p>
                      </div>
                    ) : (
                      alerts.filter(a => !a.acknowledged).slice(0, 5).map(alert => {
                        const SevIcon = severityIcon[alert.severity];
                        return (
                          <div key={alert.id} className="p-3 border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors">
                            <div className="flex items-start gap-3">
                              <SevIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${severityColor[alert.severity]}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{alert.message}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">{timeAgo(alert.timestamp)}</p>
                              </div>
                              <button onClick={() => acknowledgeAlert(alert.id)} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400" title="Acknowledge">
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="p-3 border-t border-[var(--border-color)]">
                    <button onClick={() => { setCurrentPage('alerts'); setAlertDropdown(false); }} className="w-full text-center text-sm text-emerald-400 hover:text-emerald-300 font-medium">
                      View All Alerts →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
