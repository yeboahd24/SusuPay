import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './ui/LoadingSpinner';
import type { UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole: UserRole;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role !== requiredRole) {
    const redirectPath = role === 'COLLECTOR' ? '/collector/dashboard' : '/client/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
