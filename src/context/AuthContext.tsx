/**
 * AuthContext.tsx
 * Proveedor de sesión global para Cognia.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CogniaApiError } from '../api/client';
import * as authApi from '../api/services/authApi';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  useDevAccount: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEFAULT_DEV_STUDENT_ID = '30000000-0000-0000-0000-000000000001';
const DEFAULT_DEV_STUDENT_NAME = 'Estudiante de prueba';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('cognia_token');
    const storedId = localStorage.getItem('cognia_student_id');
    const storedName = localStorage.getItem('cognia_student_name');

    if (storedToken) {
      setToken(storedToken);
      authApi
        .getMe()
        .then((me) => {
          setUser({ id: me.id, fullName: me.fullName, email: me.email });
        })
        .catch((error: unknown) => {
          if (error instanceof CogniaApiError && error.apiError.status === 401) {
            authApi.clearLocalAuth();
            setToken(null);
            setUser(null);
            return;
          }

          if (storedId) {
            setUser({
              id: storedId,
              fullName: storedName ?? DEFAULT_DEV_STUDENT_NAME,
              email: '',
            });
          }
        })
        .finally(() => setIsLoading(false));
    } else if (storedId) {
      setUser({
        id: storedId,
        fullName: storedName ?? DEFAULT_DEV_STUDENT_NAME,
        email: '',
      });
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.token);
    setUser({ id: res.studentId, fullName: res.fullName, email: res.email ?? '' });
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const normalizedEmail = email.trim();
    const normalizedName = fullName.trim();
    await authApi.register(normalizedEmail, password, normalizedName);
    const res = await authApi.login(normalizedEmail, password);
    setToken(res.token);
    setUser({ id: res.studentId, fullName: res.fullName, email: res.email ?? normalizedEmail });
  }, []);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authApi.logout(token);
    } catch (error) {
      console.warn('No se pudo cerrar la sesión en el servidor; se completó el cierre local.', error);
    } finally {
      setToken(null);
      setUser(null);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, token]);

  const useDevAccount = useCallback(() => {
    localStorage.removeItem('cognia_token');
    localStorage.setItem('cognia_student_id', DEFAULT_DEV_STUDENT_ID);
    localStorage.setItem('cognia_student_name', DEFAULT_DEV_STUDENT_NAME);
    setToken(null);
    setUser({
      id: DEFAULT_DEV_STUDENT_ID,
      fullName: DEFAULT_DEV_STUDENT_NAME,
      email: '',
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      isLoggingOut,
      useDevAccount,
    }),
    [user, token, isLoading, login, register, logout, isLoggingOut, useDevAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
