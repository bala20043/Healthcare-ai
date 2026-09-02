import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Shield,
  Info,
} from 'lucide-react';

const statusConfig = {
  TRUE: {
    label: 'TRUE',
    icon: CheckCircle2,
    bgClass: 'bg-success-50 dark:bg-success-900/20',
    borderClass: 'border-success-400/30',
    badgeBg: 'bg-success-500',
    badgeText: 'text-white',
    iconClass: 'text-success-500',
  },
  FALSE: {
    label: 'FALSE',
    icon: XCircle,
    bgClass: 'bg-danger-50 dark:bg-danger-900/20',
    borderClass: 'border-danger-400/30',
    badgeBg: 'bg-danger-500',
    badgeText: 'text-white',
    iconClass: 'text-danger-500',
  },
  MIXED: {
    label: 'MIXED',
    icon: AlertTriangle,
    bgClass: 'bg-warning-50 dark:bg-warning-900/20',
    borderClass: 'border-warning-400/30',
    badgeBg: 'bg-warning-500',
    badgeText: 'text-white',
    iconClass: 'text-warning-500',
  },
  UNVERIFIED: {
    label: 'UNVERIFIED',
    icon: HelpCircle,
    bgClass: 'bg-base-100 dark:bg-base-800/50',
    borderClass: 'border-base-300/30 dark:border-base-600/30',
    badgeBg: 'bg-base-400 dark:bg-base-500',
    badgeText: 'text-white',
    iconClass: 'text-base-400 dark:text-base-500',
  },
};

const evidenceLevelColors = {
  High: 'text-success-500',
  Moderate: 'text-warning-500',
  Low: 'text-danger-500',
};

export default function FactCheckCard({ factCheck }) {
  if (!factCheck) return null;

  const { claim, status, explanation, evidenceLevel, sources } = factCheck;
  const config = statusConfig[status] || statusConfig.UNVERIFIED;
  const StatusIcon = config.icon;

  return (
    <motion.div
      className={`rounded-xl border ${config.borderClass} overflow-hidden glass`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div className={`px-4 py-3 ${config.bgClass} border-b ${config.borderClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-500" aria-hidden="true" />
            <h4 className="text-sm font-heading font-bold text-base-700 dark:text-base-200">
              Fact Check
            </h4>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${config.badgeBg} ${config.badgeText}`}>
            <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-xs font-bold tracking-wide">{config.label}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Claim */}
        {claim && (
          <div>
            <p className="text-xs font-medium text-base-400 dark:text-base-400 uppercase tracking-wider mb-1">
              Claim
            </p>
            <p className="text-sm text-base-700 dark:text-base-200 font-medium italic">
              &ldquo;{claim}&rdquo;
            </p>
          </div>
        )}

        {/* Explanation */}
        <div>
          <p className="text-xs font-medium text-base-400 dark:text-base-400 uppercase tracking-wider mb-1">
            Explanation
          </p>
          <p className="text-sm text-base-600 dark:text-base-300 leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Evidence Level */}
        {evidenceLevel && (() => {
          const normEv = (evidenceLevel || '').toUpperCase();
          const labelText = normEv === 'HIGH' ? 'High' : normEv === 'MEDIUM' || normEv === 'MODERATE' ? 'Moderate' : 'Low';
          const labelColor = normEv === 'HIGH' ? 'text-success-500' : normEv === 'MEDIUM' || normEv === 'MODERATE' ? 'text-warning-500' : 'text-danger-500';
          const barColor = normEv === 'HIGH' ? 'bg-success-500' : normEv === 'MEDIUM' || normEv === 'MODERATE' ? 'bg-warning-500' : 'bg-danger-500';
          const activeBars = normEv === 'HIGH' ? 3 : normEv === 'MEDIUM' || normEv === 'MODERATE' ? 2 : 1;

          return (
            <div>
              <p className="text-xs font-medium text-base-400 dark:text-base-400 uppercase tracking-wider mb-1">
                Evidence Level
              </p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`w-2 h-6 rounded-full ${
                        level <= activeBars ? barColor : 'bg-base-200 dark:bg-base-700'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-sm font-semibold ${labelColor}`}>
                  {labelText}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div>
            <p className="text-xs font-medium text-base-400 dark:text-base-400 uppercase tracking-wider mb-2">
              Reliable Sources
            </p>
            <div className="space-y-1.5">
              {sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-accent-500 hover:text-accent-400 transition-colors group"
                  aria-label={`Visit ${source.name} (opens in new tab)`}
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden="true" />
                  <span className="group-hover:underline">{source.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer footer */}
      <div className="px-4 py-2.5 border-t border-base-200/50 dark:border-base-700/50 bg-base-50/50 dark:bg-base-900/30">
        <div className="flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0 text-base-400 opacity-60" aria-hidden="true" />
          <p className="text-[11px] text-base-400 opacity-60">
            Not medical advice — fact-check results are for educational reference only.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
