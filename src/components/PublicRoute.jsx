import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-50 dark:bg-base-950">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  // Only render public page if user is NOT logged in
  if (user) {
    return null;
  }

  return children;
}
