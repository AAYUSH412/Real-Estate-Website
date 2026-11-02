import apiClient, { queryCache } from '../services/apiClient';
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { APP_CONSTANTS } from '../config/constants';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [authError, setAuthError] = useState('');
  const generation = useRef(0);

  const logout = useCallback(() => {
    generation.current++; setIsLoading(false); setAuthError('');
    queryCache.clear();
    localStorage.removeItem(APP_CONSTANTS.TOKEN_KEY);
    localStorage.removeItem(APP_CONSTANTS.IS_ADMIN_KEY);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const checkAuthStatus = useCallback(async () => {
    const request = ++generation.current;
    setIsLoading(true); setAuthError('');
    if (!localStorage.getItem(APP_CONSTANTS.TOKEN_KEY)) { logout(); setIsLoading(false); return; }
    try {
      const { data } = await apiClient.get('/api/admin/session');
      if (request !== generation.current) return;
      setIsAuthenticated(true); setUser(data.user);
    } catch (error) {
      if (request !== generation.current) return;
      setIsAuthenticated(false); setUser(null);
      if ([401, 403].includes(error.response?.status)) logout();
      else setAuthError('Unable to verify your session. Check your connection and retry.');
    } finally { if (request === generation.current) setIsLoading(false); }
  }, [logout]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    const sync = event => { if (!event.key || [APP_CONSTANTS.TOKEN_KEY, APP_CONSTANTS.IS_ADMIN_KEY].includes(event.key)) checkAuthStatus(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [checkAuthStatus]);

  const login = (token, userData) => {
    generation.current++; setIsLoading(false); setAuthError('');
    localStorage.setItem(APP_CONSTANTS.TOKEN_KEY, token);
    localStorage.setItem(APP_CONSTANTS.IS_ADMIN_KEY, 'true');
    setIsAuthenticated(true);
    setUser(userData);
  };

  const value = {
    isAuthenticated,
    isLoading,
    authError,
    user,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
