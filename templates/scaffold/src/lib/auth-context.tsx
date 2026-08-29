import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export type AuthStatus = 'checking' | 'anonymous' | 'authenticated';

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  pictureUrl?: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  permissions: string[];
  status: AuthStatus;
  hasPermission: (code: string) => boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() usado fuera de <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const session = await api.auth.me();
      setUser(session.user);
      setPermissions(session.permissions);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setPermissions([]);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    setPermissions([]);
    setStatus('anonymous');
  }, []);

  const hasPermission = useCallback((code: string) => permissions.includes(code), [permissions]);

  return (
    <AuthContext.Provider value={{ user, permissions, status, hasPermission, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
