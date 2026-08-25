'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Anime } from '../api';
import { supabase, isSupabaseEnabled } from '../supabase';
import { useAuth } from './useAuth';

const WATCHLIST_KEY = 'watchlist';

/**
 * useWatchlist hook (v2 – with Supabase sync)
 *
 * Behavior:
 * - Always reads/writes localStorage for instant UX (offline-first)
 * - If Supabase is configured AND user is logged in:
 *   - On mount: merges remote watchlist into localStorage
 *   - On add/remove: syncs to Supabase in background
 * - If Supabase is not configured: works purely with localStorage (same as v1)
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Anime[]>([]);
  const { user } = useAuth();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) setWatchlist(JSON.parse(stored));
    } catch {
      setWatchlist([]);
    }
  }, []);

  // Sync from Supabase when user logs in
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || !user) return;

    supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error || !data) return;
        // Merge: remote takes priority for items that exist in both
        setWatchlist((prev) => {
          const remoteIds = new Set(data.map((r: any) => r.anime_id));
          const localOnly = prev.filter((a) => !remoteIds.has(a.id));
          const remoteAnimes: Anime[] = data.map((r: any) => r.anime_data);
          const merged = [...remoteAnimes, ...localOnly];
          try {
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify(merged));
          } catch { /* ignore */ }
          return merged;
        });
      });
  }, [user]);

  const saveToLocal = useCallback((list: Anime[]) => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    } catch { /* ignore */ }
  }, []);

  const addToWatchlist = useCallback(
    (anime: Anime) => {
      setWatchlist((prev) => {
        if (prev.some((a) => a.id === anime.id)) return prev;
        const updated = [anime, ...prev];
        saveToLocal(updated);
        // Sync to Supabase in background
        if (isSupabaseEnabled && supabase && user) {
          supabase.from('watchlist').upsert({
            user_id: user.id,
            anime_id: anime.id,
            anime_data: anime,
          }).then(({ error }) => {
            if (error) console.warn('[watchlist] Supabase sync failed:', error.message);
          });
        }
        return updated;
      });
    },
    [user, saveToLocal]
  );

  const removeFromWatchlist = useCallback(
    (id: string) => {
      setWatchlist((prev) => {
        const updated = prev.filter((a) => a.id !== id);
        saveToLocal(updated);
        // Sync to Supabase in background
        if (isSupabaseEnabled && supabase && user) {
          supabase.from('watchlist')
            .delete()
            .eq('user_id', user.id)
            .eq('anime_id', id)
            .then(({ error }) => {
              if (error) console.warn('[watchlist] Supabase delete failed:', error.message);
            });
        }
        return updated;
      });
    },
    [user, saveToLocal]
  );

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((a) => a.id === id),
    [watchlist]
  );

  const clearWatchlist = useCallback(() => {
    saveToLocal([]);
    setWatchlist([]);
    if (isSupabaseEnabled && supabase && user) {
      supabase.from('watchlist').delete().eq('user_id', user.id);
    }
  }, [user, saveToLocal]);

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, clearWatchlist };
}
