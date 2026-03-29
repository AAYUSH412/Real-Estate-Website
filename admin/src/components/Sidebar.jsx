import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  List,
  Calendar,
  LogOut,
  LayoutDashboard,
  Bell,
  User,
  ClipboardList,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  Menu,
} from 'lucide-react';
import { cn } from '../lib/utils';

const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const isActive = (path) => location.pathname === path;

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  const navSections = [
    {
      label: 'Main',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/pending-listings', label: 'Review Queue', icon: ClipboardList },
        { path: '/list', label: 'All Properties', icon: Building2 },
        { path: '/users', label: 'Users', icon: Users },
        { path: '/appointments', label: 'Appointments', icon: Calendar },
      ],
    },
    {
      label: 'Activity',
      items: [
        { path: '/activity-logs', label: 'Activity Logs', icon: FileText },
      ],
    },
  ];

  return (
    <>
      <style>{`
        .sidebar-nav::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen bg-[#1C1B1A] border-r border-white/10 z-50 flex flex-col transition-all duration-300',
          // Mobile: slide in/out based on isOpen
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, but width changes based on isCollapsed
          'lg:translate-x-0',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          'w-64' // Mobile width when open
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
          {!isCollapsed ? (
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 bg-[#D4755B] rounded-lg flex items-center justify-center shadow-lg"
              >
                <Home className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <span className="text-base font-bold text-[#FAF8F4] tracking-tight">
                  BuildEstate
                </span>
                <div className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-widest leading-none">
                  Admin Panel
                </div>
              </div>
            </Link>
          ) : (
            <Link to="/dashboard" className="flex items-center justify-center w-full">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 bg-[#D4755B] rounded-lg flex items-center justify-center shadow-lg"
              >
                <Home className="h-5 w-5 text-white" />
              </motion.div>
            </Link>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#D4755B] border-2 border-[#1C1B1A] rounded-full items-center justify-center text-white hover:bg-[#C05E44] transition-colors z-10"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        {/* Navigation */}
        <nav className="sidebar-nav flex-1 overflow-y-auto py-6 px-3" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent'
        }}>
          {navSections.map((section, idx) => (
            <div key={section.label} className={cn(idx > 0 && 'mt-6')}>
              {!isCollapsed && (
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                    {section.label}
                  </h3>
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group',
                      isCollapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2.5',
                      isActive(item.path)
                        ? 'bg-[#D4755B] text-white shadow-md'
                        : 'text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10'
                    )}
                    title={isCollapsed ? item.label : ''} // Tooltip on hover when collapsed
                  >
                    <item.icon className={cn(
                      'h-5 w-5 flex-shrink-0',
                      isActive(item.path) ? 'text-white' : 'text-[#9CA3AF] group-hover:text-[#FAF8F4]'
                    )} />
                    {!isCollapsed && <span className="flex-1">{item.label}</span>}
                    {isActive(item.path) && (
                      <motion.div
                        layoutId="activeSidebarItem"
                        className="absolute inset-0 bg-[#D4755B] rounded-lg"
                        style={{ zIndex: -1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile & Logout */}
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          {/* Notifications */}
          {!isCollapsed ? (
            <button className="w-full flex items-center gap-3 px-3 py-2.5 mb-2 text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10 rounded-lg transition-all duration-200 text-sm font-medium">
              <Bell className="h-5 w-5" />
              <span className="flex-1 text-left">Notifications</span>
              <span className="h-5 w-5 bg-[#D4755B] text-white text-xs flex items-center justify-center rounded-full">
                3
              </span>
            </button>
          ) : (
            <button className="w-full flex items-center justify-center px-3 py-2.5 mb-2 text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10 rounded-lg transition-all duration-200 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#D4755B] text-white text-[10px] flex items-center justify-center rounded-full">
                3
              </span>
            </button>
          )}

          {/* Profile */}
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-white/5 rounded-lg">
              <div className="h-9 w-9 bg-[#D4755B] rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#FAF8F4] truncate">Admin</div>
                <div className="text-xs text-[#9CA3AF]">Administrator</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center px-3 py-2.5 mb-2 bg-white/5 rounded-lg">
              <div className="h-9 w-9 bg-[#D4755B] rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
          )}

          {/* Logout */}
          {!isCollapsed ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 bg-[#1C1B1A] border border-white/10 rounded-lg shadow-lg text-[#FAF8F4]"
      >
        {isOpen ? (
          <ChevronLeft className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>
    </>
  );
};

export default Sidebar;
