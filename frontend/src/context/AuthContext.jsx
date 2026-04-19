import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('carbonlens_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authAPI.getMe()
        .then((res) => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          logout();
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('carbonlens_token', access_token);
    localStorage.setItem('carbonlens_user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('carbonlens_token', access_token);
    localStorage.setItem('carbonlens_user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('carbonlens_token');
    localStorage.removeItem('carbonlens_user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'csp_admin';
  const isAnalyst = user?.role === 'csp_analyst';
  const isCompanyUser = user?.role === 'company_user';

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout, isAdmin, isAnalyst, isCompanyUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
