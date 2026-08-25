'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Anime } from '../api';

const WATCHLIST_KEY = 'anistream_watchlist';

/**
 * useWatchlist – pure localStorage implementation.
 * Simple and crash-proof. No external dependencies.
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Anime[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setWatchlist(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const save = useCallback((list: Anime[]) => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    } catch { /* ignore */ }
  }, []);

  const addToWatchlist = useCallback(
    (anime: Anime) => {
      setWatchlist((prev) => {
        if (prev.some((a) => a.id === anime.id)) return prev;
        const next = [anime, ...prev];
        save(next);
        return next;
      });
    },
    [save]
  );

  const removeFromWatchlist = useCallback(
    (id: string) => {
      setWatchlist((prev) => {
        const next = prev.filter((a) => a.id !== id);
        save(next);
        return next;
      });
    },
    [save]
  );

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((a) => a.id === id),
    [watchlist]
  );

  const clearWatchlist = useCallback(() => {
    save([]);
    setWatchlist([]);
  }, [save]);

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, clearWatchlist };
}
