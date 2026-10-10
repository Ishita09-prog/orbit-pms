import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, onUnauthorized, setAccessToken } from '../api/client';
import { clearSession, loadSession, saveSession } from '../storage/token';
import type { AuthResponse, User } from '../types';

type Status = 'loading' | 'authed' | 'anon';

interface AuthValue {
  user: User | null;
  status: Status;
  notice: string;
  clearNotice: () => void;
  login: (body: { email: string; password: string }) => Promise<void>;
  register: (body: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children, onSignedOut }: { children: React.ReactNode; onSignedOut: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [notice, setNotice] = useState('');

  const endSession = useCallback(
    async (message = '') => {
      setAccessToken(null);
      await clearSession();
      queryClient.clear();
      await onSignedOut(); // wipes the offline cache so the next person never sees this data
      setUser(null);
      setStatus('anon');
      setNotice(message);
    },
    [queryClient, onSignedOut],
  );

  // A 401 about the session (expired / revoked / invalid) sends the person back to the login screen with a clear message.
  useEffect(() => {
    onUnauthorized((error: ApiError) =>
      endSession(error.code === 'TOKEN_EXPIRED' ? 'Your session has expired. Please log in again.' : 'You were signed out. Please log in again.'),
    );
  }, [endSession]);

  // Restore the session from secure storage on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSession();
      if (!saved) return setStatus('anon');
      if (saved.expiresAt && new Date(saved.expiresAt).getTime() <= Date.now()) {
        return endSession('Your session has expired. Please log in again.');
      }
      setAccessToken(saved.token);
      if (saved.user) setUser(saved.user);
      try {
        const { user: me } = await api.me();
        if (!cancelled) {
          setUser(me);
          setStatus('authed');
        }
      } catch (err) {
        // 401 is already handled by onUnauthorized. Offline or a server hiccup must not log anyone out.
        if (!cancelled && (err as ApiError).status !== 401) setStatus(saved.user ? 'authed' : 'anon');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endSession]);

  const apply = useCallback(async (result: AuthResponse) => {
    await saveSession(result.token, result.expiresAt, result.user);
    setAccessToken(result.token);
    setUser(result.user);
    setStatus('authed');
    setNotice('');
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      status,
      notice,
      clearNotice: () => setNotice(''),
      login: async (body) => apply(await api.login(body)),
      register: async (body) => apply(await api.register(body)),
      logout: async () => {
        try {
          await api.logout(); // revokes the token on the server
        } catch {
          /* the local session ends even if the server cannot be reached */
        }
        await endSession();
      },
    }),
    [user, status, notice, apply, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
