import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getProfile } from '../api/users';
import { logout as logoutRequest } from '../api/auth';

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
    const token = localStorage.getItem('accessToken');
    if (token) {
      getProfile()
        .then((res) => setUser(res.data?.data))
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    void logoutRequest().catch(() => {});
    localStorage.removeItem('accessToken');
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
