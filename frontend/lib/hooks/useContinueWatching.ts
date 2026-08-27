'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const CONTINUE_KEY = 'anistream_continue';
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
 * useContinueWatching – pure localStorage implementation.
 * Simple and crash-proof. No external dependencies.
 */
export function useContinueWatching() {
  const [list, setList] = useState<ContinueWatchingItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTINUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setList(parsed);
      }
    } catch {
      // ignore parse errors
    }
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
    (item: Omit<ContinueWatchingItem, 'updatedAt'>) => {
      const updated: ContinueWatchingItem = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
      setList((prev) => save([updated, ...prev.filter((i) => i.episodeSlug !== item.episodeSlug)]));

      // Auto-sync with MyAnimeList if user is authenticated and progress > 40%
      if (item.progress >= 40) {
        try {
          const malSaved = localStorage.getItem('anistream_mal_auth');
          if (malSaved) {
            const parsed = JSON.parse(malSaved);
            if (parsed.accessToken) {
              const epMatch = item.episodeTitle.match(/(\d+(\.\d+)?)/) || item.episodeSlug.match(/episode-(\d+)/i);
              const epNum = epMatch ? parseInt(epMatch[1], 10) : 1;
              fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/mal/update-status`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${parsed.accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title: item.animeTitle || item.animeSlug,
                  status: 'watching',
                  num_watched_episodes: epNum,
                }),
              }).catch(() => {
                // background sync error - ignore
              });
            }
          }
        } catch {
          // ignore
        }
      }
    },
    [save]
  );

  const removeItem = useCallback(
    (episodeSlug: string) => {
      setList((prev) => {
        const next = prev.filter((i) => i.episodeSlug !== episodeSlug);
        save(next);
        return next;
      });
    },
    [save]
  );

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(CONTINUE_KEY);
    } catch { /* ignore */ }
    setList([]);
  }, []);

  return { list, updateProgress, removeItem, clearAll };
}
