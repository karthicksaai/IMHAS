import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('imhas_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem('imhas_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('imhas_user');
      }
    } catch {
      // storage blocked - in-memory only
    }
  }, [user]);

  const login = async (email, password, role) => {
    try {
      const response = await apiLogin({ email, password, role });
      const data = response.data;
      const userData = data?.user ?? data;
      const token    = data?.token ?? data?.accessToken ?? null;
      const userObj  = { ...userData, email: userData.email ?? email, role: userData.role ?? role, token };
      setUser(userObj);
      return userObj;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error   ||
        err?.message                 ||
        'Login failed. Please check your credentials.';
      throw new Error(message);
    }
  };

  const logout = () => {
    setUser(null);
    try { sessionStorage.removeItem('imhas_user'); } catch { }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
