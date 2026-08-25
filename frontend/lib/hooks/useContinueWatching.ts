'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseEnabled } from '../supabase';
import { useAuth } from './useAuth';

const CONTINUE_KEY = 'continueWatching';
const MAX_ITEMS = 20;

export interface ContinueWatchingItem {
  episodeSlug: string;
  animeSlug: string;
  animeTitle: string;
  episodeTitle: string;
  poster: string;
  progress: number; // 0-100
  updatedAt: string; // ISO date string
}

/**
 * useContinueWatching hook (v2 – with Supabase sync)
 *
 * Behavior:
 * - Always writes to localStorage immediately (offline-first)
 * - If Supabase is configured AND user is logged in:
 *   - On mount: merges remote data into localStorage
 *   - On updateProgress: syncs to Supabase in background
 * - Throttles Supabase writes to max once per 15 seconds per episode
 */
export function useContinueWatching() {
  const [list, setList] = useState<ContinueWatchingItem[]>([]);
  const { user } = useAuth();
  // Throttle ref: tracks last Supabase sync time per episode slug
  const lastSyncRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTINUE_KEY);
      if (stored) setList(JSON.parse(stored));
    } catch {
      setList([]);
    }
  }, []);

  // Sync from Supabase when user logs in
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || !user) return;

    supabase
      .from('continue_watching')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(MAX_ITEMS)
      .then(({ data, error }) => {
        if (error || !data) return;
        setList((prev) => {
          const remoteItems: ContinueWatchingItem[] = data.map((r: any) => r.item_data);
          const remoteSlugs = new Set(remoteItems.map((i) => i.episodeSlug));
          const localOnly = prev.filter((i) => !remoteSlugs.has(i.episodeSlug));
          const merged = [...remoteItems, ...localOnly]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, MAX_ITEMS);
          try {
            localStorage.setItem(CONTINUE_KEY, JSON.stringify(merged));
          } catch { /* ignore */ }
          return merged;
        });
      });
  }, [user]);

  const saveToLocal = useCallback((items: ContinueWatchingItem[]) => {
    const sorted = [...items]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_ITEMS);
    try {
      localStorage.setItem(CONTINUE_KEY, JSON.stringify(sorted));
    } catch { /* ignore */ }
    return sorted;
  }, []);

  const updateProgress = useCallback(
    (item: Omit<ContinueWatchingItem, 'updatedAt'>) => {
      const updated: ContinueWatchingItem = {
        ...item,
        updatedAt: new Date().toISOString(),
      };

      setList((prev) => {
        const filtered = prev.filter((i) => i.episodeSlug !== item.episodeSlug);
        return saveToLocal([updated, ...filtered]);
      });

      // Supabase sync – throttle to once per 15 seconds per episode
      if (isSupabaseEnabled && supabase && user) {
        const now = Date.now();
        const lastSync = lastSyncRef.current.get(item.episodeSlug) || 0;
        if (now - lastSync > 15000) {
          lastSyncRef.current.set(item.episodeSlug, now);
          supabase.from('continue_watching').upsert({
            user_id: user.id,
            episode_slug: item.episodeSlug,
            item_data: updated,
            updated_at: updated.updatedAt,
          }).then(({ error }) => {
            if (error) console.warn('[continue-watching] Supabase sync failed:', error.message);
          });
        }
      }
    },
    [user, saveToLocal]
  );

  const removeItem = useCallback(
    (episodeSlug: string) => {
      setList((prev) => {
        const updated = prev.filter((i) => i.episodeSlug !== episodeSlug);
        saveToLocal(updated);
        if (isSupabaseEnabled && supabase && user) {
          supabase.from('continue_watching')
            .delete()
            .eq('user_id', user.id)
            .eq('episode_slug', episodeSlug);
        }
        return updated;
      });
    },
    [user, saveToLocal]
  );

  const clearAll = useCallback(() => {
    try { localStorage.removeItem(CONTINUE_KEY); } catch { /* ignore */ }
    setList([]);
    if (isSupabaseEnabled && supabase && user) {
      supabase.from('continue_watching').delete().eq('user_id', user.id);
    }
  }, [user]);

  return { list, updateProgress, removeItem, clearAll };
}
