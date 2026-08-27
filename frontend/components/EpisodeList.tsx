'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Episode } from '@/lib/api';
import { useContinueWatching } from '@/lib/hooks/useContinueWatching';

interface EpisodeListProps {
  episodes: Episode[];
  currentSlug?: string;
  animeSlug: string;
  animeTitle?: string;
  poster?: string;
}

export default function EpisodeList({
  episodes,
  currentSlug,
  animeSlug,
  animeTitle = '',
  poster = '',
}: EpisodeListProps) {
  const [sortNewest, setSortNewest] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { list: continueList, updateProgress, removeItem } = useContinueWatching();

  // Create a quick lookup map for episode progress
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    continueList.forEach((item) => {
      map.set(item.episodeSlug, item.progress);
    });
    return map;
  }, [continueList]);

  const filtered = useMemo(() => {
    let list = [...episodes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (ep) =>
          ep.title?.toLowerCase().includes(q) ||
          String(ep.episode_number)?.includes(q)
      );
    }
    if (sortNewest) {
      list = list.sort(
        (a, b) => parseFloat(b.episode_number) - parseFloat(a.episode_number)
      );
    } else {
      list = list.sort(
        (a, b) => parseFloat(a.episode_number) - parseFloat(b.episode_number)
      );
    }
    return list;
  }, [episodes, sortNewest, searchQuery]);

  const handleToggleWatched = (e: React.MouseEvent, ep: Episode, isWatched: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    if (isWatched) {
      // Mark as unwatched (remove from history)
      removeItem(ep.slug);
    } else {
      // Mark as 100% watched
      updateProgress({
        episodeSlug: ep.slug,
        animeSlug: animeSlug || '',
        animeTitle: animeTitle || ep.title,
        episodeTitle: ep.title || `Episode ${ep.episode_number}`,
        poster: poster || '',
        progress: 100,
      });
    }
  };

  return (
    <div className="bg-card border border-[#222] rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex flex-col sm:flex-row gap-3">
        <div className="flex items-center justify-between flex-1">
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
            <span>Daftar Episode</span>
            <span className="text-gray-400 text-xs font-normal bg-[#181818] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
              {episodes.length}
            </span>
          </h3>
          <button
            onClick={() => setSortNewest(!sortNewest)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#222] px-3 py-1.5 rounded-lg transition-colors border border-[#333]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>{sortNewest ? 'Terbaru' : 'Terlama'}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari episode..."
            className="w-full sm:w-48 bg-[#181818] border border-[#333] focus:border-primary text-white placeholder-gray-500 text-xs rounded-xl px-3 py-2 pl-8 focus:outline-none transition-colors"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Episode list */}
      <div className="overflow-y-auto max-h-[420px] divide-y divide-[#161616]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {searchQuery ? `Tidak ada episode untuk "${searchQuery}"` : 'Belum ada episode'}
          </div>
        ) : (
          filtered.map((ep) => {
            const isActive = ep.slug === currentSlug;
            const progress = progressMap.get(ep.slug) || 0;
            const isWatched = progress >= 75;
            const inProgress = progress > 0 && progress < 75;

            return (
              <Link
                key={ep.slug}
                href={`/episode/${ep.slug}`}
                className={`flex items-center gap-3 px-4 py-3 transition-colors group relative ${
                  isActive
                    ? 'bg-primary/20 border-l-4 border-l-primary'
                    : isWatched
                    ? 'bg-black/20 opacity-80 hover:opacity-100 hover:bg-white/[0.03]'
                    : 'hover:bg-white/5'
                }`}
              >
                {/* Episode Number Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : isWatched
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      : 'bg-[#181818] text-gray-400 border border-[#2a2a2a] group-hover:border-primary/40 group-hover:text-white'
                  }`}
                >
                  {isWatched && !isActive ? '✓' : ep.episode_number}
                </div>

                {/* Title and Watched Status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isActive
                          ? 'text-primary-light font-bold'
                          : isWatched
                          ? 'text-gray-400'
                          : 'text-gray-200 group-hover:text-white'
                      }`}
                    >
                      {ep.title || `Episode ${ep.episode_number}`}
                    </p>
                  </div>

                  {/* Progress Pill / Watched indicator */}
                  <div className="flex items-center gap-2 mt-1">
                    {isWatched ? (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Sudah Ditonton
                      </span>
                    ) : inProgress ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1 bg-[#262626] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-primary-light font-medium">
                          {progress}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-500">
                        Belum Ditonton
                      </span>
                    )}
                  </div>
                </div>

                {/* Active or Toggle Watched Action */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleWatched(e, ep, isWatched)}
                    className={`p-1.5 rounded-lg text-xs transition-colors opacity-0 group-hover:opacity-100 ${
                      isWatched
                        ? 'text-emerald-400 hover:bg-emerald-950/40 hover:text-red-400'
                        : 'text-gray-400 hover:bg-white/10 hover:text-emerald-400'
                    }`}
                    title={isWatched ? 'Tandai belum ditonton' : 'Tandai sudah ditonton'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={isWatched ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'}
                      />
                    </svg>
                  </button>

                  {isActive && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold animate-pulse">
                      Sedang Diputar
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
