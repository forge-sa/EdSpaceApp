import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { api, onSignedOut, post } from './api';
import { clearPosts } from './postStore';
import { queryClient } from './queries';
import type { AppConfig, Me } from './types';

interface Session {
  /** undefined while booting, null when signed out. */
  user: Me | null | undefined;
  setUser: (u: Me | null) => void;
  config: AppConfig | null;
  bootError: string | null;
  boot: () => void;
  signOut: () => Promise<void>;
  unread: number;
  setUnread: (n: number) => void;
  /** Moderators: teachers waiting for approval + open reports. */
  modCount: number;
  refreshUnread: () => void;
  /** The most recent signed-in user; outlives sign-out while screens unmount. */
  lastUser: Me | null;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Me | null | undefined>(undefined);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [modCount, setModCount] = useState(0);
  const userId = useRef<number | null>(null);
  const [lastUser, setLastUser] = useState<Me | null>(null);

  const setUser = useCallback((u: Me | null) => {
    // Nothing cached for one account may leak into the next.
    if (!u || (userId.current != null && u.id !== userId.current)) {
      queryClient.clear();
      clearPosts();
      setUnread(0);
      setModCount(0);
    }
    userId.current = u?.id ?? null;
    setUserState(u);
    if (u) setLastUser(u);
  }, []);

  const load = useCallback(() => {
    Promise.all([api<{ user: Me | null }>('/auth/me'), api<AppConfig>('/auth/config')])
      .then(([me, cfg]) => {
        setConfig(cfg);
        setUser(me.user);
      })
      .catch((err: Error) => setBootError(err.message));
  }, [setUser]);

  useEffect(load, [load]);

  const boot = useCallback(() => {
    setBootError(null);
    load();
  }, [load]);

  useEffect(() => {
    onSignedOut(() => setUser(null));
    return () => onSignedOut(null);
  }, [setUser]);

  const signOut = useCallback(async () => {
    await post('/auth/logout').catch(() => {});
    setUser(null);
  }, [setUser]);

  const refreshUnread = useCallback(() => {
    api<{ count: number; moderation?: number }>('/notifications/unread')
      .then((d) => {
        setUnread(d.count);
        setModCount(d.moderation ?? 0);
      })
      .catch(() => {});
  }, []);

  // Same cadence as the website: every 45 s while the app is in front, and on return.
  const signedIn = Boolean(user);
  useEffect(() => {
    if (!signedIn) return;
    refreshUnread();
    const id = setInterval(() => AppState.currentState === 'active' && refreshUnread(), 45_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshUnread());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [signedIn, refreshUnread]);

  const value = useMemo(
    () => ({ user, setUser, config, bootError, boot, signOut, unread, setUnread, modCount, refreshUnread, lastUser }),
    [user, setUser, config, bootError, boot, signOut, unread, modCount, refreshUnread, lastUser],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/**
 * The signed-in user, for screens that only exist while signed in. Right
 * after sign-out those screens may render once more before they unmount,
 * so this falls back to the last signed-in user instead of failing.
 */
export function useMe(): Me {
  const { user, lastUser } = useSession();
  return (user ?? lastUser) as Me;
}
