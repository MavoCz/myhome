import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

export function PublicRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
