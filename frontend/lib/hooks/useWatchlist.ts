'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Anime } from '../api';
import { supabase, isSupabaseConfigured } from '../supabase';

const WATCHLIST_KEY = 'anistream_watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Anime[]>([]);
  const [syncedWithCloud, setSyncedWithCloud] = useState(false);

  // Load from local storage initially
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setWatchlist(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync with Supabase when session exists
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    const loadCloudWatchlist = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('watchlist')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const cloudItems: Anime[] = data.map((row) => ({
            id: row.anime_id || row.slug,
            title: row.title,
            slug: row.slug,
            poster: row.poster,
            type: row.type || 'TV',
            status: row.status || 'Unknown',
            episodes: row.episodes ? parseInt(row.episodes, 10) : undefined,
            rating: row.rating || undefined,
          }));

          // Merge local and cloud items (cloud takes precedence)
          setWatchlist((prev) => {
            const map = new Map<string, Anime>();
            prev.forEach((item) => map.set(item.slug || item.id, item));
            cloudItems.forEach((item) => map.set(item.slug || item.id, item));
            const merged = Array.from(map.values());
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify(merged));
            return merged;
          });
          setSyncedWithCloud(true);
        }
      } catch {
        // ignore cloud sync error
      }
    };

    loadCloudWatchlist();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadCloudWatchlist();
      } else if (event === 'SIGNED_OUT') {
        setSyncedWithCloud(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const save = useCallback((list: Anime[]) => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    } catch { /* ignore */ }
  }, []);

  const addToWatchlist = useCallback(
    async (anime: Anime) => {
      setWatchlist((prev) => {
        if (prev.some((a) => a.id === anime.id || a.slug === anime.slug)) return prev;
        const next = [anime, ...prev];
        save(next);
        return next;
      });

      // Save to Supabase in background if logged in
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('watchlist').upsert({
              user_id: user.id,
              anime_id: anime.id || anime.slug,
              slug: anime.slug,
              title: anime.title,
              poster: anime.poster,
              type: anime.type,
              status: anime.status,
              episodes: anime.episodes ? String(anime.episodes) : null,
              rating: anime.rating ? String(anime.rating) : null,
            }, { onConflict: 'user_id,slug' });
          }
        } catch {
          // ignore
        }
      }
    },
    [save]
  );

  const removeFromWatchlist = useCallback(
    async (id: string) => {
      setWatchlist((prev) => {
        const next = prev.filter((a) => a.id !== id && a.slug !== id);
        save(next);
        return next;
      });

      // Delete from Supabase in background if logged in
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('watchlist')
              .delete()
              .eq('user_id', user.id)
              .or(`anime_id.eq.${id},slug.eq.${id}`);
          }
        } catch {
          // ignore
        }
      }
    },
    [save]
  );

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((a) => a.id === id || a.slug === id),
    [watchlist]
  );

  const clearWatchlist = useCallback(async () => {
    save([]);
    setWatchlist([]);

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('watchlist').delete().eq('user_id', user.id);
        }
      } catch {
        // ignore
      }
    }
  }, [save]);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    clearWatchlist,
    syncedWithCloud,
  };
}
