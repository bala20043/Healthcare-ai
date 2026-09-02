import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Edit3,
  ArrowLeft,
  Shield,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Profile() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = profile?.email || user?.email || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const userInitial = userName.charAt(0).toUpperCase();
  const authProvider = profile?.auth_provider || 'email';
  const createdAt = (profile?.created_at || user?.created_at)
    ? new Date(profile?.created_at || user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const handleOpenEdit = () => {
    setFullNameInput(userName);
    setSaveError('');
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullNameInput.trim()) return;

    setIsSaving(true);
    setSaveError('');
    try {
      await updateProfile({ full_name: fullNameInput.trim() });
      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
      }, 1000);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-base-50 dark:bg-base-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
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
            Profile
          </h1>

          {/* Profile card */}
          <div className="bg-white dark:bg-base-850 rounded-2xl border border-base-200 dark:border-base-700 overflow-hidden shadow-card">
            {/* Banner */}
            <div className="h-28 bg-gradient-to-r from-accent-500/20 to-accent-600/10 relative">
              <div className="absolute -bottom-10 left-6">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-base-850 shadow-lg" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-base-850 shadow-lg">
                    {userInitial}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="pt-14 pb-6 px-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-heading font-bold text-base-800 dark:text-base-100">
                    {userName}
                  </h2>
                  <p className="text-sm text-base-400 mt-0.5">MediVerify AI User</p>
                </div>
                <button
                  onClick={handleOpenEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-base-100 dark:bg-base-800 hover:bg-base-200 dark:hover:bg-base-700 border border-base-200 dark:border-base-700 text-sm font-medium text-base-600 dark:text-base-300 transition-colors"
                  aria-label="Edit profile"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-base-50 dark:bg-base-800/50">
                  <Mail className="w-5 h-5 text-base-400" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-base-400 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-base-700 dark:text-base-200 font-medium">{userEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-base-50 dark:bg-base-800/50">
                  <Calendar className="w-5 h-5 text-base-400" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-base-400 uppercase tracking-wider">Member Since</p>
                    <p className="text-sm text-base-700 dark:text-base-200 font-medium">{createdAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-base-50 dark:bg-base-800/50">
                  <Shield className="w-5 h-5 text-base-400" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-base-400 uppercase tracking-wider">Sign-in Method</p>
                    <p className="text-sm text-base-700 dark:text-base-200 font-medium capitalize">{authProvider === 'google' ? '🔗 Google Account' : '📧 Email & Password'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-base-200 dark:border-base-700">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger-50 dark:bg-danger-900/20 hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-600 dark:text-danger-400 text-sm font-medium transition-colors"
                aria-label="Sign out of your account"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                className="fixed inset-0 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditing(false)}
              />
              <motion.div
                className="relative w-full max-w-md bg-white dark:bg-base-850 rounded-2xl p-6 shadow-xl border border-base-200 dark:border-base-700 z-10"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-heading font-bold text-base-800 dark:text-base-100">
                    Edit Profile
                  </h3>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1 rounded-lg hover:bg-base-100 dark:hover:bg-base-800 text-base-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {saveError && (
                  <div className="p-3 mb-4 rounded-xl bg-danger-500/10 border border-danger-500/20 text-xs text-danger-500">
                    {saveError}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-base-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-base-400" />
                      <input
                        type="text"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-sm text-base-800 dark:text-base-100 focus:outline-none focus:border-accent-400"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-base-500 hover:bg-base-100 dark:hover:bg-base-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          Saved!
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
