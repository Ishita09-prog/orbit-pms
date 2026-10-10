import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, onUnauthorized, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authed | anon
  const [notice, setNotice] = useState('');

  const endSession = useCallback(
    (message = '') => {
      tokenStore.clear();
      queryClient.clear();
      setUser(null);
      setStatus('anon');
      setNotice(message);
    },
    [queryClient],
  );

  // Any 401 about the session (expired / revoked / invalid token) sends the person back to the login screen.
  useEffect(() => {
    onUnauthorized((error) =>
      endSession(
        error.code === 'TOKEN_EXPIRED'
          ? 'Your session has expired. Please log in again.'
          : 'You were signed out. Please log in again.',
      ),
    );
  }, [endSession]);

  // On first load: restore the session if there is a token that has not expired.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!tokenStore.get()) return setStatus('anon');
      if (tokenStore.isExpired()) return endSession('Your session has expired. Please log in again.');
      try {
        const { user: me } = await api.me();
        if (!cancelled) {
          setUser(me);
          setStatus('authed');
        }
      } catch (err) {
        if (cancelled) return;
        // A 401 has already ended the session (with a message) via the unauthorized handler.
        // Network trouble or a server hiccup should not log anyone out: trust the stored token and
        // let each page show its own error state.
        if (err.status !== 401) setStatus('authed');
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, [endSession]);

  const applyAuth = useCallback((result) => {
    tokenStore.set(result.token, result.expiresAt);
    setUser(result.user);
    setStatus('authed');
    setNotice('');
  }, []);

  const login = useCallback(async (credentials) => applyAuth(await api.login(credentials)), [applyAuth]);
  const register = useCallback(async (details) => applyAuth(await api.register(details)), [applyAuth]);

  const logout = useCallback(async () => {
    try {
      await api.logout(); // revokes the token on the server
    } catch {
      /* even if the server cannot be reached, the local session still ends */
    }
    endSession();
  }, [endSession]);

  const value = useMemo(
    () => ({ user, status, notice, clearNotice: () => setNotice(''), login, register, logout }),
    [user, status, notice, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
