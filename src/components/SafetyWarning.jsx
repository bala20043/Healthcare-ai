import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AlertOctagon,
  Phone,
  Info,
} from 'lucide-react';

const severityConfig = {
  standard: {
    icon: AlertTriangle,
    bgClass: 'bg-warning-50 dark:bg-warning-900/20',
    borderClass: 'border-warning-400/40 dark:border-warning-500/30',
    iconClass: 'text-warning-500',
    titleClass: 'text-warning-600 dark:text-warning-400',
    textClass: 'text-warning-600/80 dark:text-warning-400/80',
    label: '⚠️ Important Medical Information',
  },
  critical: {
    icon: AlertOctagon,
    bgClass: 'bg-danger-50 dark:bg-danger-900/20',
    borderClass: 'border-danger-400/40 dark:border-danger-500/30',
    iconClass: 'text-danger-500',
    titleClass: 'text-danger-600 dark:text-danger-400',
    textClass: 'text-danger-600/80 dark:text-danger-400/80',
    label: '🚨 Seek Professional Medical Help',
  },
};

export default function SafetyWarning({
  severity = 'standard',
  title,
  message,
  showEmergencyInfo = false,
}) {
  const config = severityConfig[severity] || severityConfig.standard;
  const IconComponent = config.icon;

  return (
    <motion.div
      className={`rounded-xl border-2 ${config.bgClass} ${config.borderClass} p-4 ${severity === 'critical' ? 'animate-pulse-border' : ''}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <IconComponent className={`w-5 h-5 ${config.iconClass}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-heading font-bold ${config.titleClass} mb-1`}>
            {title || config.label}
          </h4>
          <p className={`text-sm leading-relaxed ${config.textClass}`}>
            {message || (severity === 'standard'
              ? 'This information is provided for educational purposes only and should not be considered a medical diagnosis or professional medical advice.'
              : 'If symptoms are severe, sudden, or life-threatening, contact local emergency services or seek immediate medical attention.'
            )}
          </p>
          {showEmergencyInfo && (
            <div className={`mt-3 flex items-center gap-2 ${config.titleClass}`}>
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-semibold">
                Emergency: Call 911 (US) or your local emergency number
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Disclaimer always visible on safety warnings */}
      <div className="mt-3 pt-3 border-t border-current/10 flex items-start gap-2">
        <Info className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${config.textClass} opacity-60`} aria-hidden="true" />
        <p className={`text-xs ${config.textClass} opacity-60`}>
          Not medical advice — consult a qualified healthcare professional for personal guidance.
        </p>
      </div>
    </motion.div>
  );
}
