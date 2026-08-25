'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Episode } from '@/lib/api';

interface EpisodeListProps {
  episodes: Episode[];
  currentSlug?: string;
  animeSlug: string;
}

export default function EpisodeList({ episodes, currentSlug, animeSlug }: EpisodeListProps) {
  const [sortNewest, setSortNewest] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="bg-card border border-[#222] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex flex-col sm:flex-row gap-3">
        <div className="flex items-center justify-between flex-1">
          <h3 className="text-white font-semibold">
            Daftar Episode
            <span className="ml-2 text-gray-500 text-sm font-normal">({episodes.length} episode)</span>
          </h3>
          <button
            onClick={() => setSortNewest(!sortNewest)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#222] px-2.5 py-1.5 rounded transition-colors border border-[#333]"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            {sortNewest ? 'Terbaru' : 'Terlama'}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari episode..."
            className="w-full sm:w-44 bg-[#1a1a1a] border border-[#333] text-white placeholder-gray-600 text-xs rounded-lg px-3 py-1.5 pl-7 focus:outline-none focus:border-primary"
          />
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Episode list */}
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            {searchQuery ? `Tidak ada episode untuk "${searchQuery}"` : 'Belum ada episode'}
          </div>
        ) : (
          filtered.map((ep) => {
            const isActive = ep.slug === currentSlug;
            return (
              <Link
                key={ep.slug}
                href={`/episode/${ep.slug}`}
                className={`flex items-center gap-3 px-4 py-3 border-b border-[#111] transition-colors ${
                  isActive
                    ? 'bg-primary/20 border-l-2 border-l-primary'
                    : 'hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-[#1a1a1a] text-gray-400'
                  }`}
                >
                  {ep.episode_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isActive ? 'text-primary-light' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {ep.title || `Episode ${ep.episode_number}`}
                  </p>
                </div>
                {isActive && (
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
