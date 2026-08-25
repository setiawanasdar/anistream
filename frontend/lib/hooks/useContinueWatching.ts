'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const CONTINUE_KEY = 'continueWatching';
const MAX_ITEMS = 20;

export interface ContinueWatchingItem {
  episodeSlug: string;
  animeSlug: string;
  animeTitle: string;
  episodeTitle: string;
  poster: string;
  progress: number; // 0–100
  updatedAt: string; // ISO string
}

/**
 * useContinueWatching – localStorage-first, with optional Supabase sync.
 * Safe: never crashes, always falls back to localStorage.
 */
export function useContinueWatching() {
  const [list, setList] = useState<ContinueWatchingItem[]>([]);
  const lastSyncRef = useRef<Map<string, number>>(new Map());

  // Hydration-safe: read localStorage only on client
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTINUE_KEY);
      if (stored) setList(JSON.parse(stored));
    } catch {
      setList([]);
    }

    // Optional Supabase sync – lazy import
    (async () => {
      try {
        const { supabase, isSupabaseEnabled } = await import('../supabase');
        if (!isSupabaseEnabled || !supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
          .from('continue_watching')
          .select('item_data')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(MAX_ITEMS);
        if (data && data.length > 0) {
          const remoteItems: ContinueWatchingItem[] = data.map((r: any) => r.item_data).filter(Boolean);
          setList((prev) => {
            const remoteSlugs = new Set(remoteItems.map((i) => i.episodeSlug));
            const localOnly = prev.filter((i) => !remoteSlugs.has(i.episodeSlug));
            const merged = [...remoteItems, ...localOnly]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, MAX_ITEMS);
            try { localStorage.setItem(CONTINUE_KEY, JSON.stringify(merged)); } catch { /* ok */ }
            return merged;
          });
        }
      } catch { /* Supabase not available, continue without sync */ }
    })();
  }, []);

  const saveToLocal = useCallback((items: ContinueWatchingItem[]) => {
    const sorted = [...items]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_ITEMS);
    try { localStorage.setItem(CONTINUE_KEY, JSON.stringify(sorted)); } catch { /* ok */ }
    return sorted;
  }, []);

  const updateProgress = useCallback(
    (item: Omit<ContinueWatchingItem, 'updatedAt'>) => {
      const updated: ContinueWatchingItem = { ...item, updatedAt: new Date().toISOString() };
      setList((prev) => saveToLocal([updated, ...prev.filter((i) => i.episodeSlug !== item.episodeSlug)]));

      // Throttled Supabase sync (max once per 15s per episode)
      const now = Date.now();
      const lastSync = lastSyncRef.current.get(item.episodeSlug) || 0;
      if (now - lastSync > 15_000) {
        lastSyncRef.current.set(item.episodeSlug, now);
        (async () => {
          try {
            const { supabase, isSupabaseEnabled } = await import('../supabase');
            if (!isSupabaseEnabled || !supabase) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            await supabase.from('continue_watching').upsert({
              user_id: session.user.id,
              episode_slug: item.episodeSlug,
              item_data: updated,
              updated_at: updated.updatedAt,
            });
          } catch { /* ok */ }
        })();
      }
    },
    [saveToLocal]
  );

  const removeItem = useCallback((episodeSlug: string) => {
    setList((prev) => {
      const updated = prev.filter((i) => i.episodeSlug !== episodeSlug);
      saveToLocal(updated);
      return updated;
    });
  }, [saveToLocal]);

  const clearAll = useCallback(() => {
    try { localStorage.removeItem(CONTINUE_KEY); } catch { /* ok */ }
    setList([]);
  }, []);

  return { list, updateProgress, removeItem, clearAll };
}
