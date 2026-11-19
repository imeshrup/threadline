import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = ({ user: u, token }) => {
    setToken(token);
    setUser(u);
    return u;
  };

  const login = useCallback((email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(handleAuth), []);
  const register = useCallback((data) => api('/auth/register', { method: 'POST', body: data }).then(handleAuth), []);
  const updateProfile = useCallback((data) => api('/auth/me', { method: 'PUT', body: data }).then(handleAuth), []);
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
