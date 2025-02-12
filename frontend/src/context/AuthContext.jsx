import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { Backendurl } from '../App';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${Backendurl}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUser(response.data);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (token, userData) => {
    localStorage.setItem('token', token);
    setIsLoggedIn(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);