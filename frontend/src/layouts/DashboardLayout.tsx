import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { 
  LayoutDashboard, 
  FileText, 
  ShieldCheck, 
  Brain, 
  Settings, 
  LogOut, 
  Bell, 
  Sun, 
  Moon, 
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [darkTheme, setDarkTheme] = useState(() => localStorage.getItem('theme') === 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  
  const [apiHealth, setApiHealth] = useState<{ status: string; responseTimeMs: number; success: boolean }>({
    status: 'OPERATIONAL',
    responseTimeMs: 80,
    success: true
  });

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'AI Anomaly Flagged', desc: 'Spine Therapy invoice POL-908123-HP flagged high risk.', time: '10m ago', unread: true, type: 'danger' },
    { id: 2, title: 'Coverage Grace Period', desc: 'Jessica Taylor (POL-445892-HP) entered grace period.', time: '2h ago', unread: true, type: 'warning' },
    { id: 3, title: 'Reminders Synced', desc: 'Dispatched 4 premium notifications to HealthPass gateway.', time: '4h ago', unread: false, type: 'info' }
  ]);

  useEffect(() => {
    if (darkTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkTheme]);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const res = await api.post('/insurer/profile/api-health-check');
        setApiHealth(res.data);
      } catch (err) {
        setApiHealth({ status: 'OFFLINE', responseTimeMs: 0, success: false });
      }
    };

    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  // Shared nav link class builder
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-red-50 text-red-600 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
    }`;

  const navClassCollapsed = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 ${
      isActive
        ? 'bg-red-50 text-red-600'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
    }`;

  const navItems = [
    { to: '/', end: true, icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/claims', icon: <FileText size={17} />, label: 'Claims Center', roles: ['ADMIN', 'CLAIMS_STAFF', 'AUDITOR'] },
    { to: '/policies', icon: <ShieldCheck size={17} />, label: 'Linked Policies' },
    { to: '/ai-hub', icon: <Brain size={17} />, label: 'AI Intelligence', badge: 'AI' },
    { to: '/settings', icon: <Settings size={17} />, label: 'Settings' },
  ].filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      
      {/* ── SIDEBAR DESKTOP ── */}
      <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-30 transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-sm z-10"
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Brand */}
        <div className={`flex items-center gap-2.5 px-4 h-14 border-b border-slate-100 shrink-0 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm leading-none">H</span>
          </div>
          {!sidebarCollapsed && (
            <div>
              <span className="font-bold text-sm text-slate-900 leading-tight block">HealthPass</span>
              <span className="text-[10px] text-slate-400 leading-tight">Insurance Panel</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {!sidebarCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Main</p>
          )}
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={sidebarCollapsed ? navClassCollapsed : navClass}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!sidebarCollapsed && (
                <span className="flex-1 flex items-center justify-between">
                  {item.label}
                  {item.badge && (
                    <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className={`border-t border-slate-100 p-3 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          {!sidebarCollapsed ? (
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-semibold shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogoutClick}
              title="Sign out"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'md:pl-16' : 'md:pl-56'}`}>
        
        {/* TOPBAR */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-4">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
          >
            <Menu size={18} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="w-full pl-8 pr-12 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-white border border-slate-200 rounded px-1 py-0.5 font-mono hidden sm:block">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* API health */}
            <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              apiHealth.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700 animate-pulse'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${apiHealth.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {apiHealth.success ? (
                <span>API <strong>{apiHealth.responseTimeMs}ms</strong></span>
              ) : (
                <span className="flex items-center gap-1"><ShieldAlert size={11} /> Offline</span>
              )}
            </div>

            {/* Dark mode */}
            <button
              onClick={() => setDarkTheme(!darkTheme)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {darkTheme ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors relative"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                        <span className="text-sm font-semibold text-slate-800">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                            className="text-xs text-red-600 font-medium hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item));
                              setNotificationsOpen(false);
                            }}
                            className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${n.unread ? 'bg-red-50/40' : ''}`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-slate-800">{n.title}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{n.desc}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-semibold cursor-default">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-6 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-30 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-56 bg-white border-r border-slate-200 z-40 md:hidden flex flex-col"
            >
              {/* Mobile brand */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <span className="font-bold text-sm text-slate-900">HealthPass</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>

              {/* Mobile nav */}
              <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={navClass}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-auto">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Mobile footer */}
              <div className="border-t border-slate-100 p-3">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-400">{user?.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
