import { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { APP_CONSTANTS } from '../config/constants';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem(APP_CONSTANTS.TOKEN_KEY);
    localStorage.removeItem(APP_CONSTANTS.IS_ADMIN_KEY);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const checkAuthStatus = useCallback(() => {
    try {
      const token = localStorage.getItem(APP_CONSTANTS.TOKEN_KEY);
      const isAdmin = localStorage.getItem(APP_CONSTANTS.IS_ADMIN_KEY);
      
      if (token && isAdmin === 'true') {
        // Presence check only — an expired access token is refreshed
        // silently by the apiClient interceptor via the httpOnly cookie
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        setIsAuthenticated(true);
        setUser({
          email: tokenData.email || 'Admin',
          role: 'admin',
          id: tokenData.id
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = (token, userData) => {
    localStorage.setItem(APP_CONSTANTS.TOKEN_KEY, token);
    localStorage.setItem(APP_CONSTANTS.IS_ADMIN_KEY, 'true');
    setIsAuthenticated(true);
    setUser(userData);
  };

  const value = {
    isAuthenticated,
    isLoading,
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
