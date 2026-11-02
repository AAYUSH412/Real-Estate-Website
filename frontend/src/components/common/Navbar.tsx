import React from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/properties', label: 'Properties' },
  { path: '/ai-hub', label: 'AI Hub' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 100], [0.8, 0.95]);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  // Initials avatar
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <>
    {/* Skip-to-main-content — keyboard accessibility */}
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-[#D4755B] focus:text-white focus:font-manrope focus:font-bold focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
    >
      Skip to main content
    </a>
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ backgroundColor: `rgba(255, 255, 255, ${bgOpacity.get()})` }}
      className="sticky top-0 z-50 border-b border-[#E6D5C3] backdrop-blur-md"
    >
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0" onClick={closeMobileMenu}>
          <img src="/logo.png" alt="BuildEstate" width="36" height="36" className="h-9 w-auto" />
          <span className="font-fraunces text-2xl font-bold text-[#111827]">BuildEstate</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-manrope transition-[color] ${
                isActive(link.path)
                  ? 'text-[#D4755B] font-semibold'
                  : 'text-[#374151] hover:text-[#D4755B]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <Link
                to="/add-property"
                className="bg-[#D4755B] text-white font-manrope font-bold px-5 py-2 rounded-xl hover:bg-[#B86851] transition-[background-color,box-shadow] hover:shadow-md active:scale-[0.96] transition-transform"
              >
                + List Property
              </Link>

              <Dropdown.Root open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
                <Dropdown.Trigger asChild>
                  <button aria-label="User menu" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FAF8F4]">
                    <span className="w-8 h-8 rounded-lg bg-[#D4755B] text-white flex items-center justify-center">{initials}</span>
                    <span>{user.name.split(' ')[0]}</span>
                  </button>
                </Dropdown.Trigger>
                <Dropdown.Portal><Dropdown.Content align="end" sideOffset={8} className="w-56 bg-white border rounded-xl p-2 z-[100]">
                  <Dropdown.Label className="px-3 py-2 text-sm truncate">{user.email}</Dropdown.Label>
                  {[
                    { to: '/dashboard', label: 'Dashboard' },
                    { to: '/my-listings', label: 'My Listings' },
                  ].map(({ to, label }) => <Dropdown.Item key={to} asChild><Link to={to} className="block px-3 py-2 rounded-lg outline-none data-[highlighted]:bg-gray-100">{label}</Link></Dropdown.Item>)}
                  <Dropdown.Separator className="border-t my-1" />
                  <Dropdown.Item onSelect={handleLogout} className="px-3 py-2 rounded-lg outline-none cursor-pointer data-[highlighted]:bg-red-50">Logout</Dropdown.Item>
                </Dropdown.Content></Dropdown.Portal>
              </Dropdown.Root>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="font-manrope font-semibold text-[#374151] hover:text-[#D4755B] transition-[color] px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-[#D4755B] text-white font-manrope font-bold px-6 py-2 rounded-xl hover:bg-[#B86851] transition-[background-color,box-shadow] hover:shadow-md active:scale-[0.96]"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-[#374151] hover:text-[#D4755B] transition-[color]"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          <span className="font-material-icons text-2xl" aria-hidden="true">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-[#E6D5C3] shadow-lg py-4 px-8 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-manrope text-base py-2.5 transition-[color] ${
                isActive(link.path) ? 'text-[#D4755B] font-semibold' : 'text-[#374151]'
              }`}
              onClick={closeMobileMenu}
            >
              {link.label}
            </Link>
          ))}

          <div className="border-t border-gray-100 mt-2 pt-3 flex flex-col gap-1">
            {isAuthenticated && user ? (
              <>
                <p className="font-manrope text-xs text-[#9CA3AF] mb-1">
                  Signed in as <span className="font-semibold text-[#374151]">{user.name}</span>
                </p>
                <Link to="/dashboard" className="font-manrope text-base py-2.5 text-[#374151] hover:text-[#D4755B] transition-[color]" onClick={closeMobileMenu}>Dashboard</Link>
                <Link to="/my-listings" className="font-manrope text-base py-2.5 text-[#374151] hover:text-[#D4755B] transition-[color]" onClick={closeMobileMenu}>My Listings</Link>
                <Link
                  to="/add-property"
                  className="mt-2 bg-[#D4755B] text-white font-manrope font-bold text-sm px-6 py-3 rounded-lg hover:bg-[#B86851] transition-all text-center"
                  onClick={closeMobileMenu}
                >
                  + List Property
                </Link>
                <button onClick={handleLogout} className="font-manrope text-base py-2.5 text-left text-[#374151] hover:text-red-500 transition-[color]">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="font-manrope font-semibold text-base py-2.5 text-[#374151]" onClick={closeMobileMenu}>Sign In</Link>
                <Link
                  to="/signup"
                  className="mt-2 bg-[#D4755B] text-white font-manrope font-bold text-sm px-6 py-3 rounded-lg hover:bg-[#B86851] transition-all text-center"
                  onClick={closeMobileMenu}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </motion.nav>
    </>
  );
};

export default Navbar;
