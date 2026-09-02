import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Globe,
  Trash2,
  Shield,
  Info,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { clearAllChatHistory } from '../services/api';
import Navbar from '../components/Navbar';

export default function Settings() {
  const { theme, setLightMode, setDarkMode } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleClearHistory = async () => {
    try {
      await clearAllChatHistory();
      setCleared(true);
      setShowClearConfirm(false);
      setTimeout(() => setCleared(false), 3000);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  return (
    <div className="min-h-screen bg-base-50 dark:bg-base-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-base-400 hover:text-base-600 dark:hover:text-base-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-heading font-bold text-base-800 dark:text-base-100 mb-6">
            Settings
          </h1>

          <div className="space-y-6">
            {/* Appearance */}
            <section className="bg-white dark:bg-base-850 rounded-2xl border border-base-200 dark:border-base-700 overflow-hidden shadow-card">
              <div className="px-6 py-4 border-b border-base-200 dark:border-base-700">
                <h2 className="text-lg font-heading font-semibold text-base-800 dark:text-base-100 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-accent-500" aria-hidden="true" />
                  Appearance
                </h2>
                <p className="text-sm text-base-400 mt-1">Choose your preferred display theme</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={setLightMode}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      theme === 'light'
                        ? 'border-accent-400 bg-accent-50 dark:bg-accent-900/20'
                        : 'border-base-200 dark:border-base-700 hover:border-base-300 dark:hover:border-base-600'
                    }`}
                    aria-label="Switch to light mode"
                    aria-pressed={theme === 'light'}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      theme === 'light' ? 'bg-accent-500 text-white' : 'bg-base-100 dark:bg-base-800 text-base-400'
                    }`}>
                      <Sun className="w-5 h-5" />
                    </div>
                    <span className={`text-sm font-medium ${
                      theme === 'light' ? 'text-accent-500' : 'text-base-500 dark:text-base-400'
                    }`}>
                      Light Mode
                    </span>
                    {theme === 'light' && (
                      <Check className="w-4 h-4 text-accent-500" />
                    )}
                  </button>

                  <button
                    onClick={setDarkMode}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      theme === 'dark'
                        ? 'border-accent-400 bg-accent-50 dark:bg-accent-900/20'
                        : 'border-base-200 dark:border-base-700 hover:border-base-300 dark:hover:border-base-600'
                    }`}
                    aria-label="Switch to dark mode"
                    aria-pressed={theme === 'dark'}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      theme === 'dark' ? 'bg-accent-500 text-white' : 'bg-base-100 dark:bg-base-800 text-base-400'
                    }`}>
                      <Moon className="w-5 h-5" />
                    </div>
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-accent-500' : 'text-base-500 dark:text-base-400'
                    }`}>
                      Dark Mode
                    </span>
                    {theme === 'dark' && (
                      <Check className="w-4 h-4 text-accent-500" />
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Language */}
            <section className="bg-white dark:bg-base-850 rounded-2xl border border-base-200 dark:border-base-700 overflow-hidden shadow-card">
              <div className="px-6 py-4 border-b border-base-200 dark:border-base-700">
                <h2 className="text-lg font-heading font-semibold text-base-800 dark:text-base-100 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-accent-500" aria-hidden="true" />
                  Language
                </h2>
                <p className="text-sm text-base-400 mt-1">Select your preferred language</p>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => setSelectedLanguage('en')}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedLanguage === 'en'
                      ? 'border-accent-400 bg-accent-50 dark:bg-accent-900/20'
                      : 'border-base-200 dark:border-base-700'
                  }`}
                  aria-pressed={selectedLanguage === 'en'}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🇬🇧</span>
                    <span className="text-sm font-medium text-base-700 dark:text-base-200">English</span>
                  </div>
                  {selectedLanguage === 'en' && <Check className="w-4 h-4 text-accent-500" />}
                </button>

                <div className="relative">
                  <button
                    disabled
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-base-200 dark:border-base-700 opacity-60 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🇮🇳</span>
                      <span className="text-sm font-medium text-base-700 dark:text-base-200">தமிழ் (Tamil)</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-base-200 dark:bg-base-700 text-base-400 font-medium">
                      Coming Soon
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* Privacy */}
            <section className="bg-white dark:bg-base-850 rounded-2xl border border-base-200 dark:border-base-700 overflow-hidden shadow-card">
              <div className="px-6 py-4 border-b border-base-200 dark:border-base-700">
                <h2 className="text-lg font-heading font-semibold text-base-800 dark:text-base-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent-500" aria-hidden="true" />
                  Privacy
                </h2>
                <p className="text-sm text-base-400 mt-1">Manage your data and privacy settings</p>
              </div>
              <div className="p-6 space-y-4">
                {/* Data explanation */}
                <div className="p-4 rounded-xl bg-base-50 dark:bg-base-800/50 border border-base-200 dark:border-base-700">
                  <div className="flex items-start gap-2.5 mb-3">
                    <Info className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-base-700 dark:text-base-200">
                      What we store
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-base-500 dark:text-base-400 ml-6.5">
                    <li className="flex items-start gap-2">
                      <span className="text-success-500 mt-1">•</span>
                      <span><strong>Account info:</strong> Your email and display name for authentication.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-success-500 mt-1">•</span>
                      <span><strong>Preferences:</strong> Theme and language settings (stored locally on your device).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-warning-500 mt-1">•</span>
                      <span><strong>Chat history:</strong> Conversation titles and messages are session-only by default. Saved history requires explicit opt-in.</span>
                    </li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-base-200 dark:border-base-700">
                    <h3 className="text-sm font-semibold text-base-700 dark:text-base-200 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-base-400" aria-hidden="true" />
                      What we don&apos;t store
                    </h3>
                    <ul className="space-y-2 text-sm text-base-500 dark:text-base-400 ml-6.5">
                      <li className="flex items-start gap-2">
                        <span className="text-danger-500 mt-1">•</span>
                        <span>No personal health information (PHI) is persisted without your explicit consent.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-danger-500 mt-1">•</span>
                        <span>No medical records, diagnoses, or treatment data.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Clear history */}
                <div className="pt-2">
                  {!showClearConfirm ? (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger-50 dark:bg-danger-900/20 hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-600 dark:text-danger-400 text-sm font-medium transition-colors border border-danger-200 dark:border-danger-500/20"
                      aria-label="Clear all chat history"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear Chat History
                    </button>
                  ) : (
                    <motion.div
                      className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-500/20"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="text-sm text-danger-600 dark:text-danger-400 mb-3">
                        Are you sure? This will permanently delete all your saved conversations.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleClearHistory}
                          className="px-4 py-2 bg-danger-500 hover:bg-danger-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Yes, Clear All
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="px-4 py-2 bg-base-200 dark:bg-base-700 hover:bg-base-300 dark:hover:bg-base-600 text-base-600 dark:text-base-300 text-sm font-medium rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {cleared && (
                    <motion.p
                      className="mt-3 text-sm text-success-500 flex items-center gap-1.5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Check className="w-4 h-4" />
                      Chat history cleared successfully
                    </motion.p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
