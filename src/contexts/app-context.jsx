'use client';

import React, { useMemo, useState, useEffect, useContext, createContext, useCallback } from 'react';

import { safeParse } from 'src/utils/helper';

const AppContext = createContext(null);

const USER_KEY = 'user';
const USER_EVENT = 'app:user-updated'; // . same-tab event

export const AppProvider = ({ children }) => {


  const [userState, setUserState] = useState(() => {
    if (typeof window === 'undefined') return null;
    return safeParse(localStorage.getItem(USER_KEY)) || null;
  });

  // Remove the useEffect that loads user on mount — no longer needed

  // . Stable setter (IMPORTANT)
  const setUser = useCallback((data) => {
    setUserState(data);

    if (typeof window !== 'undefined') {
      try {
        if (data) localStorage.setItem(USER_KEY, JSON.stringify(data));
        else localStorage.removeItem(USER_KEY);

        // . storage event DOES NOT fire in same tab, so dispatch custom event
        window.dispatchEvent(new CustomEvent(USER_EVENT, { detail: data || null }));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // . If localStorage changes from another tab → update this tab too
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (e) => {
      if (e.key !== USER_KEY) return;
      const storedUser = safeParse(localStorage.getItem(USER_KEY));
      setUserState(storedUser || null);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onUserUpdated = (e) => {
      setUserState(e.detail || null);
    };

    window.addEventListener(USER_EVENT, onUserUpdated);
    return () => window.removeEventListener(USER_EVENT, onUserUpdated);
  }, []);
  // ADD this after your existing useEffects
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = safeParse(localStorage.getItem(USER_KEY));
    if (stored && !userState) {
      setUserState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const value = useMemo(
    () => ({
      user: userState,
      setUser,
      USER_EVENT, // . export event name (optional helper)
    }),
    [userState, setUser]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within an AppProvider');
  return ctx;
};
