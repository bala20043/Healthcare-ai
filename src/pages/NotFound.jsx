import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-50 dark:bg-base-950 px-4">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-400/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="text-center relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-heading font-bold text-base-800 dark:text-base-100">
            MediVerify <span className="text-accent-400">AI</span>
          </span>
        </div>

        {/* 404 */}
        <motion.div
          className="text-8xl sm:text-9xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-600 mb-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          404
        </motion.div>

        <h1 className="text-2xl font-heading font-bold text-base-800 dark:text-base-100 mb-3">
          Page Not Found
        </h1>
        <p className="text-base-400 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        <Link
          to={user ? '/dashboard' : '/'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-colors duration-200 shadow-glow hover:shadow-glow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          {user ? 'Back to Dashboard' : 'Back to Home'}
        </Link>
      </motion.div>
    </div>
  );
}
