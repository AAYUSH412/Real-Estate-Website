import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { userAPI } from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: string;
  retrySession: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (fullName: string, email: string, phone: string, password: string) => Promise<{ requiresVerification?: boolean; verificationEmailSent?: boolean }>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  establishSession: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('buildestate_token'));
  const [isLoading, setIsLoading] = useState(true);

  const [sessionError, setSessionError] = useState('');
  const generation = useRef(0);
  const retrySession = useCallback(async () => {
    const request = ++generation.current;
    setIsLoading(true); setSessionError('');
    try {
      if (!localStorage.getItem('buildestate_token')) { setToken(null); setUser(null); return; }
      const { data } = await userAPI.getProfile();
      if (request === generation.current && localStorage.getItem('buildestate_token')) {
        setUser(data); setToken(localStorage.getItem('buildestate_token'));
        localStorage.setItem('buildestate_user', JSON.stringify(data));
      }
    } catch (error: any) {
      if (request === generation.current) {
        setToken(null); setUser(null);
        if ([401, 403].includes(error.response?.status)) { localStorage.removeItem('buildestate_token'); localStorage.removeItem('buildestate_user'); }
        else setSessionError('Unable to verify your session. Check your connection and retry.');
      }
    } finally { if (request === generation.current) setIsLoading(false); }
  }, []);
  useEffect(() => {
    retrySession();
    return () => { generation.current++; };
  }, [retrySession]);

  const establishSession = useCallback((nextToken: string, nextUser: User) => {
    generation.current++; setIsLoading(false); setSessionError('');
    localStorage.setItem('buildestate_token', nextToken);
    localStorage.setItem('buildestate_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    const syncSession = () => {
      const nextToken = localStorage.getItem('buildestate_token');
      setToken(nextToken);
      try { setUser(nextToken ? JSON.parse(localStorage.getItem('buildestate_user') || 'null') : null); }
      catch { setUser(null); setToken(null); }
    };
    window.addEventListener('buildestate:session', syncSession);
    const syncStorage = (event: StorageEvent) => { if (!event.key || ['buildestate_token', 'buildestate_user'].includes(event.key)) retrySession(); };
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener('buildestate:session', syncSession);
      window.removeEventListener('storage', syncStorage);
    };
  }, [retrySession]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    const { data } = await userAPI.login({ email, password, rememberMe });
    if (data.success && data.token) {
      establishSession(data.token, data.user);
    } else {
      throw new Error(data.message || 'Login failed');
    }
  }, [establishSession]);

  const register = useCallback(async (fullName: string, email: string, phone: string, password: string) => {
    const { data } = await userAPI.register({ fullName, email, phone, password });
    if (data.success && data.requiresVerification) {
      return { requiresVerification: true, verificationEmailSent: data.verificationEmailSent };
    }
    if (data.success && data.token) {
      establishSession(data.token, data.user);
      return {};
    }
    throw new Error(data.message || 'Registration failed');
  }, [establishSession]);

  const logout = useCallback(() => {
    generation.current++; setIsLoading(false); setSessionError('');
    // Fire-and-forget — revokes the httpOnly refresh cookie server-side
    userAPI.logout().catch(() => {});
    localStorage.removeItem('buildestate_token');
    localStorage.removeItem('buildestate_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem('buildestate_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        sessionError,
        retrySession,
        login,
        register,
        logout,
        updateUser,
        establishSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
