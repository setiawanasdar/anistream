'use client';

import { useRef } from 'react';
import Link from 'next/link';
import AnimeCard from './AnimeCard';
import AnimeCardSkeleton from './AnimeCardSkeleton';
import type { Anime } from '@/lib/api';

interface AnimeRowProps {
  title: string;
  animes: Anime[];
  loading?: boolean;
  seeAllHref?: string;
}

const SKELETON_COUNT = 8;

export default function AnimeRow({ title, animes, loading = false, seeAllHref }: AnimeRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 600;
    scrollRef.current.scrollBy({
      left: direction === 'right' ? amount : -amount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4 sm:px-6">
        <h2 className="text-white font-bold text-lg sm:text-xl flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full inline-block" />
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-primary-light text-sm hover:text-primary transition-colors"
          >
            Lihat Semua →
          </Link>
        )}
      </div>

      {/* Scroll wrapper with arrow buttons */}
      <div className="relative group/row">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll kiri"
        >
          <div className="w-8 h-8 rounded-full bg-black/80 border border-[#333] flex items-center justify-center hover:bg-primary transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </button>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="scroll-container flex gap-3 px-4 sm:px-6 pb-2"
        >
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))
            : animes.map((anime) => (
                <AnimeCard
                  key={anime.id || anime.slug}
                  id={anime.id}
                  title={anime.title}
                  slug={anime.slug}
                  poster={anime.poster}
                  type={anime.type}
                  status={anime.status}
                  episodes={anime.episodes}
                  rating={anime.rating}
                />
              ))}

          {/* Empty state */}
          {!loading && animes.length === 0 && (
            <p className="text-gray-500 text-sm py-4">Tidak ada anime ditemukan.</p>
          )}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll kanan"
        >
          <div className="w-8 h-8 rounded-full bg-black/80 border border-[#333] flex items-center justify-center hover:bg-primary transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </section>
  );
}
