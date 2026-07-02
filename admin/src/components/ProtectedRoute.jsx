import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin');

  // Presence check only. An expired access token is fine here — the first
  // API call returns 401 and the apiClient interceptor silently refreshes
  // it via the httpOnly admin_refresh cookie (or redirects to /login).
  if (!token || isAdmin !== 'true') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
