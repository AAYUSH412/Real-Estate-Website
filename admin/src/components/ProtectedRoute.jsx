import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, authError, checkAuthStatus } = useAuth();
  if (isLoading) return <p role="status" className="p-8">Verifying session…</p>;
  if (authError) return <div role="alert" className="p-8"><p>{authError}</p><button onClick={checkAuthStatus} className="underline">Retry</button></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};
export default ProtectedRoute;
