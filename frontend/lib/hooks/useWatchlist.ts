'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Anime } from '../api';

const WATCHLIST_KEY = 'watchlist';

/**
 * useWatchlist – localStorage-first, with optional Supabase sync.
 * Safe: never crashes, always falls back to localStorage.
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Anime[]>([]);
  const [mounted, setMounted] = useState(false);

  // Hydration-safe: only read localStorage on client
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) setWatchlist(JSON.parse(stored));
    } catch {
      setWatchlist([]);
    }

    // Optional Supabase sync – lazy import to avoid crash if package missing
    (async () => {
      try {
        const { supabase, isSupabaseEnabled } = await import('../supabase');
        if (!isSupabaseEnabled || !supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
          .from('watchlist')
          .select('anime_data')
          .eq('user_id', session.user.id);
        if (data && data.length > 0) {
          const remoteAnimes: Anime[] = data.map((r: any) => r.anime_data).filter(Boolean);
          setWatchlist((prev) => {
            const remoteIds = new Set(remoteAnimes.map((a) => a.id));
            const localOnly = prev.filter((a) => !remoteIds.has(a.id));
            const merged = [...remoteAnimes, ...localOnly];
            try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(merged)); } catch { /* ok */ }
            return merged;
          });
        }
      } catch { /* Supabase not available, continue without sync */ }
    })();
  }, []);

  const saveToLocal = useCallback((list: Anime[]) => {
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch { /* ok */ }
  }, []);

  const addToWatchlist = useCallback((anime: Anime) => {
    setWatchlist((prev) => {
      if (prev.some((a) => a.id === anime.id)) return prev;
      const updated = [anime, ...prev];
      saveToLocal(updated);
      // Background Supabase sync
      (async () => {
        try {
          const { supabase, isSupabaseEnabled } = await import('../supabase');
          if (!isSupabaseEnabled || !supabase) return;
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;
          await supabase.from('watchlist').upsert({
            user_id: session.user.id, anime_id: anime.id, anime_data: anime,
          });
        } catch { /* ok */ }
      })();
      return updated;
    });
  }, [saveToLocal]);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveToLocal(updated);
      (async () => {
        try {
          const { supabase, isSupabaseEnabled } = await import('../supabase');
          if (!isSupabaseEnabled || !supabase) return;
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;
          await supabase.from('watchlist').delete()
            .eq('user_id', session.user.id).eq('anime_id', id);
        } catch { /* ok */ }
      })();
      return updated;
    });
  }, [saveToLocal]);

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((a) => a.id === id),
    [watchlist]
  );

  const clearWatchlist = useCallback(() => {
    saveToLocal([]);
    setWatchlist([]);
  }, [saveToLocal]);

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, clearWatchlist, mounted };
}
