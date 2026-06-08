import axios from 'axios';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getProfile } from '../api/users';
import { logout as logoutRequest } from '../api/auth';
import { setAccessToken } from '../api/client';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: () => {},
  isManager: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
    axios.post(`${base}/auth/refresh`, {}, { withCredentials: true })
      .then((resp) => {
        const token = resp.data?.data?.accessToken;
        if (token) {
          setAccessToken(token);
          return getProfile();
        }
        return null;
      })
      .then((res) => { if (res) setUser(res.data?.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    void logoutRequest().catch(() => {});
    setAccessToken(null);
    setUser(null);
  };

  const isManager = user?.roles?.some((r) => r === 'HOTEL_MANAGER' || r === 'ROLE_HOTEL_MANAGER') ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, isManager }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
