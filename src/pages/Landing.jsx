import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Bot,
  ShieldCheck,
  BookOpen,
  HeartPulse,
  Link2,
  Languages,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const features = [
  {
    icon: Bot,
    title: 'AI Health Assistant',
    description: 'Ask healthcare-related questions and receive easy-to-understand explanations.',
    color: 'from-accent-400 to-accent-600',
  },
  {
    icon: ShieldCheck,
    title: 'Fact Verification',
    description: 'Verify common healthcare claims and misinformation.',
    color: 'from-blue-400 to-blue-600',
  },
  {
    icon: BookOpen,
    title: 'Evidence-Based Information',
    description: 'Answers are designed to be supported by reliable medical information.',
    color: 'from-emerald-400 to-emerald-600',
  },
  {
    icon: HeartPulse,
    title: 'Safe Guidance',
    description: 'Receive appropriate safety information and guidance.',
    color: 'from-rose-400 to-rose-600',
  },
  {
    icon: Link2,
    title: 'Reliable Sources',
    description: 'View the sources used to support answers.',
    color: 'from-violet-400 to-violet-600',
  },
  {
    icon: Languages,
    title: 'Multilingual Support',
    description: 'Designed to support English and Tamil in the future.',
    color: 'from-amber-400 to-amber-600',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.title = 'MediVerify AI — Healthcare Fact Verification & Safe Guidance';
    // Set meta tags
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Ask healthcare questions, verify medical claims, and receive clear evidence-based information from trusted sources. AI-powered healthcare fact verification assistant.');
    setMeta('og:title', 'MediVerify AI — Healthcare Fact Verification & Safe Guidance', true);
    setMeta('og:description', 'AI-powered healthcare information assistant. Verify medical claims, understand misinformation, and receive evidence-based explanations.', true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', window.location.href, true);
  }, []);

  return (
    <div className="min-h-screen bg-base-50 dark:bg-base-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-light dark:glass border-b border-base-200/30 dark:border-base-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="MediVerify AI Home">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-bold text-base-800 dark:text-base-100">
              MediVerify <span className="text-accent-400">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-base-200 dark:hover:bg-base-800 text-base-500 transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-base-600 dark:text-base-300 hover:text-base-800 dark:hover:text-base-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-xl transition-colors duration-200 shadow-glow hover:shadow-glow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent-400/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-500/5 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-400/20 mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="w-4 h-4 text-accent-400" aria-hidden="true" />
            <span className="text-sm font-medium text-accent-500">
              AI-Powered Healthcare Information
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-7xl font-heading font-bold text-base-800 dark:text-base-100 mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            MediVerify{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-600">
              AI
            </span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-base-500 dark:text-base-400 font-heading font-medium mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            AI-Powered Healthcare Fact Verification & Safe Guidance
          </motion.p>

          <motion.p
            className="text-base text-base-400 dark:text-base-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Ask healthcare questions, verify medical claims, and receive clear evidence-based
            information from trusted sources.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link
              to="/register"
              className="group flex items-center gap-2 px-8 py-3.5 bg-accent-500 hover:bg-accent-600 text-white text-base font-semibold rounded-xl transition-all duration-200 shadow-glow hover:shadow-glow-lg"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-8 py-3.5 bg-base-100 dark:bg-base-800 hover:bg-base-200 dark:hover:bg-base-700 text-base-700 dark:text-base-200 text-base font-semibold rounded-xl border border-base-200 dark:border-base-700 transition-all duration-200"
            >
              Sign In
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-base-400 dark:text-base-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-accent-400" aria-hidden="true" />
              <span>Evidence-Based</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-accent-400" aria-hidden="true" />
              <span>Safety-First Design</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-accent-400" aria-hidden="true" />
              <span>Trusted Sources</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-base-100/50 dark:bg-base-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-base-800 dark:text-base-100 mb-4">
              Intelligent Healthcare{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-600">
                Information
              </span>
            </h2>
            <p className="text-base-400 dark:text-base-400 max-w-2xl mx-auto">
              Designed to help you understand healthcare topics with clarity,
              accuracy, and appropriate safety guidance.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="group relative p-6 rounded-2xl bg-white dark:bg-base-850 border border-base-200 dark:border-base-700 hover:border-accent-400/30 transition-all duration-300 hover:shadow-card-hover"
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-base-700 dark:text-base-200 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-base-400 dark:text-base-400 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-6 rounded-2xl bg-warning-50 dark:bg-warning-900/10 border border-warning-200/50 dark:border-warning-500/20">
            <p className="text-sm text-warning-600 dark:text-warning-400 leading-relaxed">
              <strong>Important:</strong> MediVerify AI is an educational healthcare information tool only.
              It does not diagnose diseases or replace professional medical consultation.
              Always consult a qualified healthcare provider for medical advice.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-200 dark:border-base-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-400" aria-hidden="true" />
            <span className="text-sm font-heading font-semibold text-base-600 dark:text-base-400">
              MediVerify AI
            </span>
          </div>
          <p className="text-xs text-base-400 dark:text-base-500">
            © {new Date().getFullYear()} MediVerify AI. For educational purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}
