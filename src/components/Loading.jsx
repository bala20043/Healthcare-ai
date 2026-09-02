import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export default function Loading({ fullPage = false, size = 'md', text = '' }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinner = (
    <motion.div
      className="flex flex-col items-center justify-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <Activity className={`${sizeClasses[size]} text-accent-400`} />
      </motion.div>
      {text && (
        <p className="text-sm text-base-400 dark:text-base-400 font-body">
          {text}
        </p>
      )}
      {fullPage && !text && (
        <div className="flex flex-col items-center gap-1">
          <h3 className="text-lg font-heading font-semibold text-base-800 dark:text-base-100">
            MediVerify AI
          </h3>
          <p className="text-sm text-base-400 dark:text-base-400">
            Loading...
          </p>
        </div>
      )}
    </motion.div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-base-50 dark:bg-base-950 z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}
