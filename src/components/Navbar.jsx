import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onMenuClick, showMenuButton = false }) {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const userInitial = userName.charAt(0).toUpperCase();

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Profile', path: '/profile' },
    { label: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="sticky top-0 z-30 glass-light dark:glass border-b border-base-200/50 dark:border-base-800/50">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-base-200 dark:hover:bg-base-800 text-base-500 transition-colors"
              aria-label="Toggle sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group" aria-label="MediVerify AI Home">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow duration-300">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-bold text-base-800 dark:text-base-100 hidden sm:block">
              MediVerify <span className="text-accent-400">AI</span>
            </span>
          </Link>
        </div>

        {/* Center nav links (desktop) */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  location.pathname === link.path
                    ? 'text-accent-500 bg-accent-500/10'
                    : 'text-base-500 dark:text-base-400 hover:text-base-700 dark:hover:text-base-200 hover:bg-base-100 dark:hover:bg-base-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language selector */}
          {user && (
            <button
              onClick={() => navigate('/settings')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-base-500 hover:text-base-700 dark:text-base-400 dark:hover:text-base-200 hover:bg-base-100 dark:hover:bg-base-800 transition-colors cursor-pointer border border-transparent hover:border-base-200 dark:hover:border-base-700"
              title="Language Settings (English)"
              aria-label="Language selector — click to change in Settings"
            >
              <Globe className="w-4 h-4 text-accent-500" />
              <span className="text-xs font-semibold">EN</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-base-200 dark:hover:bg-base-800 text-base-500 dark:text-base-400 transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* User dropdown */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-base-100 dark:hover:bg-base-800 transition-colors"
                aria-label="User menu"
                aria-expanded={showDropdown}
                aria-haspopup="true"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-sm font-bold">
                    {userInitial}
                  </div>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-base-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white dark:bg-base-850 border border-base-200 dark:border-base-700 shadow-card overflow-hidden"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-base-100 dark:border-base-700">
                      <p className="text-sm font-medium text-base-700 dark:text-base-200 truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-base-400 truncate">
                        {user?.email}
                      </p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-base-600 dark:text-base-300 hover:bg-base-100 dark:hover:bg-base-800 transition-colors"
                      >
                        <User className="w-4 h-4" aria-hidden="true" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-base-600 dark:text-base-300 hover:bg-base-100 dark:hover:bg-base-800 transition-colors"
                      >
                        <Settings className="w-4 h-4" aria-hidden="true" />
                        Settings
                      </Link>
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-base-100 dark:border-base-700 py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
