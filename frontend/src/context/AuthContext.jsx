import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../api/authApi';

const AuthContext = createContext(null);

/**
 * Demo credentials — used when the backend has no /api/auth route.
 * Any email + password "demo" works, or use the real credentials below.
 */
const DEMO_USERS = [
  { email: 'karthicksaai197@gmail.com', password: 'demo',   role: 'doctor',        name: 'Dr. Karthick' },
  { email: 'admin@imhas.com',           password: 'admin',  role: 'admin',          name: 'Admin' },
  { email: 'nurse@imhas.com',           password: 'nurse',  role: 'nurse',          name: 'Nurse Staff' },
];

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
      if (user) sessionStorage.setItem('imhas_user', JSON.stringify(user));
      else       sessionStorage.removeItem('imhas_user');
    } catch { /* storage blocked — in-memory only */ }
  }, [user]);

  const login = async (email, password, role) => {
    /* ── 1. Try real backend first ─────────────────────────────────────── */
    try {
      const response = await apiLogin({ email, password, role });
      const data     = response.data;
      const userData = data?.user ?? data;
      const token    = data?.token ?? data?.accessToken ?? null;
      const userObj  = { ...userData, email: userData.email ?? email, role: userData.role ?? role, token };
      setUser(userObj);
      return userObj;
    } catch (err) {
      const status = err?.response?.status;

      /* ── 2. If backend has no auth route (404) or is unreachable, use demo login ── */
      if (status === 404 || status === undefined || err?.message?.includes('ERR_CONNECTION_REFUSED')) {
        // Accept any non-empty email + password in demo mode
        if (!email || !password) throw new Error('Email and password are required.');

        // Find a matching demo user or build a generic one from the form values
        const demoMatch = DEMO_USERS.find(
          d => d.email.toLowerCase() === email.toLowerCase()
        );

        const userObj = demoMatch
          ? { ...demoMatch, token: 'demo-token' }
          : { email, role, name: email.split('@')[0], token: 'demo-token' };

        setUser(userObj);
        console.info('[IMHAS] Auth route not found on backend — using demo login mode.');
        return userObj;
      }

      /* ── 3. Any other error (401, 500, etc.) — surface the real message ── */
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
