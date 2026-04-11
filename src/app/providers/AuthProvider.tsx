import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { AuthUser } from '@/types/electron';

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Sincroniza `user` con la sesión del proceso principal (p. ej. tras editar perfil). */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.api?.auth : undefined;
    if (!api) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await api.ensureAdmin();
        const u = await api.getCurrentUser();
        if (!cancelled) setUser(u);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const api = window.api?.auth;
    if (!api) throw new Error('La app debe ejecutarse en Electron.');
    const u = await api.login(username.trim(), password);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    const api = window.api?.auth;
    if (!api) return;
    await api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const api = window.api?.auth;
    if (!api) return;
    const u = await api.getCurrentUser();
    setUser(u);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      logout,
      refreshUser,
    }),
    [user, ready, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
