'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';

const CONTINUE_KEY = 'anistream_continue';
const MAX_ITEMS = 30;

export interface ContinueWatchingItem {
  episodeSlug: string;
  animeSlug: string;
  animeTitle: string;
  episodeTitle: string;
  poster: string;
  progress: number; // 0–100
  updatedAt: string; // ISO string
}

export function useContinueWatching() {
  const [list, setList] = useState<ContinueWatchingItem[]>([]);
  const [syncedWithCloud, setSyncedWithCloud] = useState(false);

  // Load from local storage initially
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTINUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setList(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync with Supabase when session exists
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    const loadCloudHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('watch_history')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(MAX_ITEMS);

        if (!error && Array.isArray(data)) {
          const cloudItems: ContinueWatchingItem[] = data.map((row) => ({
            episodeSlug: row.episode_slug,
            animeSlug: row.anime_slug,
            animeTitle: row.anime_title,
            episodeTitle: row.episode_title,
            poster: row.poster,
            progress: row.progress || 0,
            updatedAt: row.updated_at,
          }));

          // Merge local and cloud history
          setList((prev) => {
            const map = new Map<string, ContinueWatchingItem>();
            prev.forEach((item) => map.set(item.episodeSlug, item));
            cloudItems.forEach((item) => map.set(item.episodeSlug, item));
            const merged = Array.from(map.values())
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, MAX_ITEMS);
            localStorage.setItem(CONTINUE_KEY, JSON.stringify(merged));
            return merged;
          });
          setSyncedWithCloud(true);
        }
      } catch {
        // ignore
      }
    };

    loadCloudHistory();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadCloudHistory();
      } else if (event === 'SIGNED_OUT') {
        setSyncedWithCloud(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const save = useCallback((items: ContinueWatchingItem[]) => {
    const sorted = [...items]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_ITEMS);
    try {
      localStorage.setItem(CONTINUE_KEY, JSON.stringify(sorted));
    } catch { /* ignore */ }
    return sorted;
  }, []);

  const updateProgress = useCallback(
    async (item: Omit<ContinueWatchingItem, 'updatedAt'>) => {
      const updated: ContinueWatchingItem = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
      setList((prev) => save([updated, ...prev.filter((i) => i.episodeSlug !== item.episodeSlug)]));

      // Save to Supabase in background if logged in
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('watch_history').upsert({
              user_id: user.id,
              episode_slug: item.episodeSlug,
              anime_slug: item.animeSlug,
              anime_title: item.animeTitle,
              episode_title: item.episodeTitle,
              poster: item.poster,
              progress: item.progress,
              updated_at: updated.updatedAt,
            }, { onConflict: 'user_id,episode_slug' });
          }
        } catch {
          // ignore
        }
      }
    },
    [save]
  );

  const removeItem = useCallback(
    async (episodeSlug: string) => {
      setList((prev) => {
        const next = prev.filter((i) => i.episodeSlug !== episodeSlug);
        save(next);
        return next;
      });

      if (supabase && isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('watch_history')
              .delete()
              .eq('user_id', user.id)
              .eq('episode_slug', episodeSlug);
          }
        } catch {
          // ignore
        }
      }
    },
    [save]
  );

  const clearAll = useCallback(async () => {
    try {
      localStorage.removeItem(CONTINUE_KEY);
    } catch { /* ignore */ }
    setList([]);

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('watch_history').delete().eq('user_id', user.id);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  return { list, updateProgress, removeItem, clearAll, syncedWithCloud };
}
