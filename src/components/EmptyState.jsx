import { motion } from 'framer-motion';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  className = '',
}) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center text-center p-8 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-base-100 dark:bg-base-800 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-base-400 dark:text-base-500" />
        </div>
      )}
      <h3 className="text-lg font-heading font-semibold text-base-700 dark:text-base-200 mb-2">
        {title}
      </h3>
      <p className="text-sm text-base-400 dark:text-base-400 max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action}
          className="px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent-400"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
