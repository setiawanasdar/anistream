'use client';

import { useState } from 'react';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import type { Anime } from '@/lib/api';

interface WatchlistButtonProps {
  anime: Anime;
}

export default function WatchlistButton({ anime }: WatchlistButtonProps) {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [toast, setToast] = useState<string | null>(null);
  const inWatchlist = isInWatchlist(anime.id);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleToggle = () => {
    if (inWatchlist) {
      removeFromWatchlist(anime.id);
      showToast('Dihapus dari watchlist');
    } else {
      addToWatchlist(anime);
      showToast('Ditambahkan ke watchlist');
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
          inWatchlist
            ? 'bg-primary/20 border-primary text-primary-light hover:bg-primary/30'
            : 'bg-[#1a1a1a] border-[#333] text-gray-300 hover:bg-[#222] hover:border-primary hover:text-white'
        }`}
        aria-label={inWatchlist ? 'Hapus dari watchlist' : 'Tambah ke watchlist'}
      >
        <svg
          className={`w-4 h-4 transition-colors ${inWatchlist ? 'text-primary-light fill-current' : 'text-gray-400'}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          fill={inWatchlist ? 'currentColor' : 'none'}
          strokeWidth={inWatchlist ? 0 : 2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        {inWatchlist ? 'Ditambahkan' : '+ Watchlist'}
      </button>

      {/* Toast notification */}
      {toast && (
        <div className="toast absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1a1a] border border-[#333] text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg z-20">
          {toast}
        </div>
      )}
    </div>
  );
}
