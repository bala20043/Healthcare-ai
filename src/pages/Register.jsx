import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Mail, Lock, Eye, EyeOff, User, Loader2, CheckCircle2, X, Shield, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
    terms: z
      .boolean()
      .refine((val) => val === true, 'You must accept the terms and privacy policy'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function Register() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'terms' | 'privacy' | null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const termsAccepted = watch('terms');
  const password = watch('password');

  // Password strength indicators
  const passwordChecks = [
    { label: 'At least 8 characters', met: password?.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password || '') },
    { label: 'One lowercase letter', met: /[a-z]/.test(password || '') },
    { label: 'One number', met: /[0-9]/.test(password || '') },
  ];

  const [isConfirmedSession, setIsConfirmedSession] = useState(false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const res = await signUp(data.email, data.password, data.fullName);
      setSuccess(true);
      if (res?.session) {
        setIsConfirmedSession(true);
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setIsConfirmedSession(false);
      }
    } catch (err) {
      setAuthError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleAcceptModal = () => {
    setValue('terms', true, { shouldValidate: true });
    setActiveModal(null);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-50 dark:bg-base-950 px-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-success-100 dark:bg-success-900/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success-500" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-base-800 dark:text-base-100 mb-2">
            Account Created!
          </h2>

          {isConfirmedSession ? (
            <>
              <p className="text-base-400 mb-4">
                Your account has been created successfully. Redirecting to dashboard...
              </p>
              <div className="w-8 h-1 bg-accent-500 rounded-full mx-auto animate-pulse" />
            </>
          ) : (
            <>
              <p className="text-sm text-base-400 mb-4">
                Please check your email inbox to confirm your account before logging in.
              </p>
              <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 text-xs text-accent-400 mb-6 text-left">
                <strong>Tip for instant login:</strong> In your <strong>Supabase Dashboard → Authentication → Providers → Email</strong>, turn off <em>&quot;Confirm email&quot;</em> to log in instantly without waiting for an email.
              </div>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-colors"
              >
                Go to Sign In
              </Link>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-50 dark:bg-base-950 px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-accent-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-accent-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6" aria-label="MediVerify AI Home">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-heading font-bold text-base-800 dark:text-base-100">
              MediVerify <span className="text-accent-400">AI</span>
            </span>
          </Link>
          <h1 className="text-2xl font-heading font-bold text-base-800 dark:text-base-100 mb-2">
            Create an account
          </h1>
          <p className="text-sm text-base-400">
            Start exploring evidence-based healthcare information
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white dark:bg-base-850 rounded-2xl border border-base-200 dark:border-base-700 p-8 shadow-card">
          {authError && (
            <motion.div
              className="mb-4 p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-500/20 text-sm text-danger-600 dark:text-danger-400 space-y-2"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
            >
              <p className="font-medium">{authError}</p>
              {authError.toLowerCase().includes('already registered') && (
                <div className="pt-1 flex items-center gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold transition-colors"
                  >
                    Sign In Now →
                  </Link>
                  <span className="text-xs text-base-500 dark:text-base-400">or use &quot;Continue with Google&quot; below</span>
                </div>
              )}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-base-600 dark:text-base-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400" aria-hidden="true" />
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  {...register('fullName')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-base-50 dark:bg-base-800 border ${errors.fullName ? 'border-danger-400' : 'border-base-200 dark:border-base-700'} text-base-700 dark:text-base-200 placeholder:text-base-400 focus:outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-400/30 text-sm transition-colors`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1.5 text-xs text-danger-500" role="alert">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-base-600 dark:text-base-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-base-50 dark:bg-base-800 border ${errors.email ? 'border-danger-400' : 'border-base-200 dark:border-base-700'} text-base-700 dark:text-base-200 placeholder:text-base-400 focus:outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-400/30 text-sm transition-colors`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-danger-500" role="alert">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-base-600 dark:text-base-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password')}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-base-50 dark:bg-base-800 border ${errors.password ? 'border-danger-400' : 'border-base-200 dark:border-base-700'} text-base-700 dark:text-base-200 placeholder:text-base-400 focus:outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-400/30 text-sm transition-colors`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-600 dark:hover:text-base-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-danger-500" role="alert">{errors.password.message}</p>
              )}
              {/* Password strength */}
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordChecks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${check.met ? 'bg-success-500' : 'bg-base-300 dark:bg-base-600'}`} />
                      <span className={check.met ? 'text-success-500' : 'text-base-400'}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-base-600 dark:text-base-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400" aria-hidden="true" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-base-50 dark:bg-base-800 border ${errors.confirmPassword ? 'border-danger-400' : 'border-base-200 dark:border-base-700'} text-base-700 dark:text-base-200 placeholder:text-base-400 focus:outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-400/30 text-sm transition-colors`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-600 dark:hover:text-base-300 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-danger-500" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('terms')}
                  className="mt-0.5 w-4 h-4 rounded border-base-300 dark:border-base-600 text-accent-500 focus:ring-accent-400"
                />
                <span className="text-sm text-base-500 dark:text-base-400 leading-snug">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setActiveModal('terms')}
                    className="text-accent-500 hover:text-accent-600 underline font-medium cursor-pointer"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => setActiveModal('privacy')}
                    className="text-accent-500 hover:text-accent-600 underline font-medium cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1.5 text-xs text-danger-500" role="alert">{errors.terms.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !termsAccepted}
              className="w-full py-3 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-base-200 dark:border-base-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-base-400 bg-white dark:bg-base-850">OR</span>
            </div>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-3 bg-base-50 dark:bg-base-800 hover:bg-base-100 dark:hover:bg-base-700 disabled:opacity-60 disabled:cursor-not-allowed border border-base-200 dark:border-base-700 rounded-xl text-sm font-medium text-base-700 dark:text-base-200 transition-colors duration-200 flex items-center justify-center gap-3"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-base-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-500 hover:text-accent-600 font-medium transition-colors">
            Sign In
          </Link>
        </p>
      </motion.div>

      {/* Interactive Terms & Privacy Policy Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
            />

            <motion.div
              className="relative w-full max-w-lg bg-white dark:bg-base-850 rounded-2xl p-6 shadow-2xl border border-base-200 dark:border-base-700 z-10 max-h-[85vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-base-200 dark:border-base-700 shrink-0">
                <div className="flex items-center gap-2.5">
                  {activeModal === 'terms' ? (
                    <FileText className="w-5 h-5 text-accent-500" />
                  ) : (
                    <Shield className="w-5 h-5 text-accent-500" />
                  )}
                  <h3 className="text-lg font-heading font-bold text-base-800 dark:text-base-100">
                    {activeModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg hover:bg-base-100 dark:hover:bg-base-800 text-base-400 hover:text-base-600 dark:hover:text-base-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 text-sm text-base-600 dark:text-base-300 leading-relaxed pr-2">
                {activeModal === 'terms' ? (
                  <>
                    <p className="font-semibold text-base-800 dark:text-base-100">
                      Welcome to MediVerify AI. By registering and using our service, you agree to the following Terms of Service:
                    </p>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-accent-500 mb-1">1. Educational Reference Purpose Only</h4>
                        <p>
                          MediVerify AI is an artificial intelligence-assisted healthcare information assistant. All answers, fact checks, and explanations are provided strictly for educational and informational reference. MediVerify AI does not provide medical diagnoses, treatment prescriptions, or clinical medical advice.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-accent-500 mb-1">2. No Doctor-Patient Relationship</h4>
                        <p>
                          Using MediVerify AI does not create a doctor-patient or healthcare provider relationship. Always consult a qualified physician, pharmacist, or healthcare professional regarding personal medical concerns or before starting or stopping any medication.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-accent-500 mb-1">3. Emergency Situations</h4>
                        <p>
                          MediVerify AI is not an emergency response system. If you or someone around you is experiencing severe symptoms, chest pain, difficulty breathing, or a medical emergency, call 911 (or your local emergency number) immediately.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-accent-500 mb-1">4. Acceptable Use</h4>
                        <p>
                          You agree to use MediVerify AI responsibly and legally. Automated scraping, malicious query injection, or attempt to compromise service security is strictly prohibited.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-base-800 dark:text-base-100">
                      Your privacy is essential to us. MediVerify AI is built with privacy-first principles:
                    </p>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-accent-500 mb-1">1. Information We Collect</h4>
                        <p>
                          We collect your email address and display name for account authentication and chat history management.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-accent-500 mb-1">2. No Personal Health Information (PHI) Sales</h4>
                        <p>
                          We never sell, rent, or trade your personal information, conversation history, or medical inquiries to third parties or advertisers.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-accent-500 mb-1">3. Data Security & Encryption</h4>
                        <p>
                          All communications between your browser, our API backend, and Supabase are encrypted using HTTPS and TLS 1.3 standards.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-accent-500 mb-1">4. User Control & Data Deletion</h4>
                        <p>
                          You retain full ownership of your data. You can clear your entire conversation history anytime from the Settings page.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-base-200 dark:border-base-700 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-base-500 hover:bg-base-100 dark:hover:bg-base-800 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAcceptModal}
                  className="px-5 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors"
                >
                  I Understand & Agree
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
