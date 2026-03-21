import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  List,
  PlusSquare,
  Calendar,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Bell,
  User,
  ChevronDown,
  Settings,
  ClipboardList,
  Users,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setIsMoreOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsProfileOpen(false);
    setIsMoreOpen(false);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsMenuOpen(false);
    setIsMoreOpen(false);
  };

  const toggleMore = () => {
    setIsMoreOpen(!isMoreOpen);
    setIsProfileOpen(false);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/list', label: 'Properties', icon: List },
    { path: '/pending-listings', label: 'Review', icon: ClipboardList },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/appointments', label: 'Bookings', icon: Calendar },
  ];

  const secondaryItems = [
    { path: '/add', label: 'Add Property', icon: PlusSquare },
    { path: '/activity-logs', label: 'Logs', icon: FileText },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 w-full z-50 transition-all duration-300',
        scrolled
          ? 'bg-[rgba(28,27,26,0.98)] backdrop-blur-md shadow-xl border-b border-white/10'
          : 'bg-[#1C1B1A] shadow-md border-b border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 bg-[#D4755B] rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-terracotta transition-all duration-300"
            >
              <Home className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <span className="text-lg font-bold text-[#FAF8F4] tracking-tight">
                BuildEstate
              </span>
              <div className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-widest leading-none">
                Admin Panel
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive(item.path)
                    ? 'text-[#FAF8F4] bg-[#D4755B]'
                    : 'text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive(item.path) && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 bg-[#D4755B] rounded-lg"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
            {/* Secondary actions dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-1 px-3 py-2 text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10 rounded-lg text-sm font-medium transition-all duration-200"
                onClick={toggleMore}
              >
                <Settings className="h-4 w-4" />
                More
                <ChevronDown className="h-3 w-3" />
              </button>

              <AnimatePresence>
                {isMoreOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-40 bg-[#1C1B1A] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden z-50"
                  >
                    {secondaryItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMoreOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10 transition-colors"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#D4755B] rounded-full" />
            </motion.button>

            {/* Profile Dropdown */}
            <div className="relative">
              <motion.button
                onClick={toggleProfile}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
              >
                <div className="h-8 w-8 bg-[#D4755B] rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-sm font-semibold text-[#FAF8F4]">Admin</div>
                  <div className="text-xs text-[#9CA3AF]">Administrator</div>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-[#9CA3AF] transition-transform duration-200',
                    isProfileOpen && 'rotate-180'
                  )}
                />
              </motion.button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 bg-[#1C1B1A] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="text-sm font-semibold text-[#FAF8F4]">Admin Panel</div>
                      <div className="text-xs text-[#9CA3AF] mt-0.5">Manage your properties</div>
                    </div>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10 flex items-center gap-2.5 transition-colors">
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <motion.button
              onClick={toggleMenu}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="h-6 w-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-[#141312] border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 pt-3 pb-5 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200',
                    isActive(item.path)
                      ? 'bg-[#D4755B] text-white'
                      : 'text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}

              {/* Secondary items */}
              <div className="pt-2 mt-2 border-t border-white/10">
                {secondaryItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive(item.path)
                        ? 'bg-[#D4755B] text-white'
                        : 'text-[#9CA3AF] hover:text-[#FAF8F4] hover:bg-white/10'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Mobile Profile */}
              <div className="pt-3 mt-3 border-t border-white/10">
                <div className="flex items-center gap-3 px-4 py-3 mb-1">
                  <div className="h-10 w-10 bg-[#D4755B] rounded-xl flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#FAF8F4]">Admin</div>
                    <div className="text-xs text-[#9CA3AF]">Administrator</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;