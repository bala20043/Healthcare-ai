import { motion } from 'framer-motion';
import { Bot, User, Info } from 'lucide-react';
import FactCheckCard from './FactCheckCard';
import SafetyWarning from './SafetyWarning';

export default function MessageBubble({ message, isUser, timestamp, factCheck, safetyLevel }) {
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <motion.div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
      initial={{ opacity: 0, y: 12, x: isUser ? 12 : -12 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
          isUser
            ? 'bg-accent-500/20 text-accent-400'
            : 'bg-base-200 dark:bg-base-700 text-base-500 dark:text-base-300'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[70%] space-y-2`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-accent-500 text-white rounded-br-md'
              : 'bg-base-100 dark:bg-base-800 text-base-700 dark:text-base-200 rounded-bl-md border border-base-200/60 dark:border-base-700/60'
          }`}
        >
          {/* AI message text with paragraphs and formatting */}
          {!isUser ? (
            <div className="space-y-2">
              {(message || '').split('\n').map((paragraph, i) => {
                if (!paragraph.trim()) return null;
                // Handle numbered lists
                if (/^\d+\./.test(paragraph.trim())) {
                  return (
                    <p key={i} className="ml-2">
                      {paragraph.split('**').map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                      )}
                    </p>
                  );
                }
                return (
                  <p key={i}>
                    {paragraph.split('**').map((part, j) =>
                      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )}
                  </p>
                );
              })}
            </div>
          ) : (
            <p>{message || ''}</p>
          )}
        </div>

        {/* AI disclaimer (only shown when Safety Warning is not present to avoid triple repetition) */}
        {!isUser && !safetyLevel && (
          <div className="flex items-center gap-1 px-1">
            <Info className="w-3 h-3 text-base-400 opacity-40" aria-hidden="true" />
            <span className="text-[10px] text-base-400 opacity-40">
              Educational reference only
            </span>
          </div>
        )}

        {/* Safety warning */}
        {!isUser && safetyLevel && safetyLevel !== 'none' && (
          <div className="w-full">
            <SafetyWarning
              severity={safetyLevel === 'warning' ? 'critical' : 'standard'}
              showEmergencyInfo={safetyLevel === 'warning'}
            />
          </div>
        )}

        {/* Fact check card */}
        {!isUser && factCheck && (
          <div className="w-full">
            <FactCheckCard factCheck={factCheck} />
          </div>
        )}

        {/* Timestamp */}
        {formattedTime && (
          <span className="text-[10px] text-base-400 dark:text-base-500 px-1">
            {formattedTime}
          </span>
        )}
      </div>
    </motion.div>
  );
}
