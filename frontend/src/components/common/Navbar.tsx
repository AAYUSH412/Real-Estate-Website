import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 100], [0.8, 0.95]);
  const backdropBlur = useTransform(scrollY, [0, 100], ["blur(8px)", "blur(12px)"]);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/');
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/properties', label: 'Properties' },
    { path: '/ai-hub', label: 'AI Property Hub' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ backgroundColor: `rgba(255, 255, 255, ${bgOpacity.get()})`, backdropFilter: backdropBlur }}
      className="sticky top-0 z-50 border-b border-[#E6D5C3]"
    >
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3" onClick={closeMobileMenu}>
          <img src="/logo.png" alt="BuildEstate" className="h-9 w-auto" />
          <span className="font-fraunces text-2xl font-bold text-[#111827]">BuildEstate</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-manrope transition-colors ${
                isActive(link.path)
                  ? 'text-[#D4755B] font-semibold'
                  : 'text-[#374151] hover:text-[#D4755B]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <Link
                to="/my-listings"
                className={`font-manrope transition-colors ${
                  isActive('/my-listings')
                    ? 'text-[#D4755B] font-semibold'
                    : 'text-[#374151] hover:text-[#D4755B]'
                }`}
              >
                My Listings
              </Link>
              <Link
                to="/add-property"
                className="bg-[#D4755B] text-white font-manrope font-bold px-5 py-2 rounded-lg hover:bg-[#B86851] transition-all hover:shadow-lg"
              >
                + List Property
              </Link>
              <button
                onClick={handleLogout}
                className="font-manrope font-semibold text-[#374151] hover:text-[#D4755B] transition-colors px-4 py-2"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="font-manrope font-semibold text-[#374151] hover:text-[#D4755B] transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-[#D4755B] text-white font-manrope font-bold px-6 py-2 rounded-lg hover:bg-[#B86851] transition-all hover:shadow-lg"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-[#374151] hover:text-[#D4755B] transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="font-material-icons text-2xl">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-[#E6D5C3] shadow-lg py-4 px-8 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-manrope text-lg py-2 transition-colors ${
                isActive(link.path)
                  ? 'text-[#D4755B] font-semibold'
                  : 'text-[#374151] hover:text-[#D4755B]'
              }`}
              onClick={closeMobileMenu}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-gray-100 my-2 pt-4 flex flex-col gap-4">
            {isAuthenticated && user ? (
              <>
                <span className="font-manrope text-sm text-[#374151]">
                  Signed in as <span className="font-semibold">{user.name}</span>
                </span>
                <Link
                  to="/my-listings"
                  className="font-manrope font-semibold text-[#374151] hover:text-[#D4755B] transition-colors py-2"
                  onClick={closeMobileMenu}
                >
                  My Listings
                </Link>
                <Link
                  to="/add-property"
                  className="bg-[#D4755B] text-white font-manrope font-bold px-6 py-3 rounded-lg hover:bg-[#B86851] transition-all hover:shadow-lg text-center"
                  onClick={closeMobileMenu}
                >
                  + List Property
                </Link>
                <button
                  onClick={handleLogout}
                  className="font-manrope font-semibold text-[#374151] hover:text-[#D4755B] transition-colors py-2 text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="font-manrope font-semibold text-[#374151] hover:text-[#D4755B] transition-colors py-2"
                  onClick={closeMobileMenu}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-[#D4755B] text-white font-manrope font-bold px-6 py-3 rounded-lg hover:bg-[#B86851] transition-all hover:shadow-lg text-center"
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
  );
};

export default Navbar;