import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import * as api from '../services/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const logoutWithServer = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore logout API failures; local logout still proceeds
    }
    logout();
  }, [logout]);

  useEffect(() => {
    const verifyToken = async () => {
      if (user && user.token) {
        try {
          const { data } = await api.getProfile();
          setUser({ ...data, token: user.token });
        } catch (error) {
          console.error("Token verification failed", error);
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout]);

  const login = async (email, password, role) => {
    try {
      const { data } = await api.login({ email, password, role });
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Login failed" 
      };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await api.register(userData);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Registration failed" 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout: logoutWithServer, register, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
