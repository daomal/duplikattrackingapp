import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user' | 'all';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole = 'all' 
}) => {
  const { user, isAdmin, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Redirect if user is not logged in
    if (!user) {
      console.log("User not authenticated, redirecting to auth page");
      navigate('/auth', { replace: true });
      return;
    }

    // Wait for profile to load
    if (!profile) {
      console.log("Profile not loaded yet, waiting...");
      return;
    }

    // Check role requirements
    if (requiredRole === 'admin' && !isAdmin) {
      console.log("User is not an admin, redirecting to dashboard");
      navigate('/dashboard-supir', { replace: true });
      return;
    }

    if (requiredRole === 'user' && isAdmin) {
      console.log("Admin trying to access user route, redirecting to admin");
      navigate('/admin', { replace: true });
      return;
    }
  }, [user, isAdmin, profile, isLoading, navigate, requiredRole]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/dashboard-supir" replace />;
  }

  if (requiredRole === 'user' && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;