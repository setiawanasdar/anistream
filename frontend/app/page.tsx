'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { Anime } from '@/lib/api';
import AnimeRow from '@/components/AnimeRow';
import ContinueWatching from '@/components/ContinueWatching';

// ─── Hero Banner ─────────────────────────────────────────────────────────────

function HeroBanner({ anime }: { anime: Anime }) {
  return (
    <div className="relative w-full h-[56vw] min-h-[280px] max-h-[520px] overflow-hidden">
      {/* Backdrop / poster as background */}
      <div className="absolute inset-0">
        <Image
          src={anime.poster}
          alt={anime.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-top scale-110 blur-sm"
          unoptimized
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full px-4 sm:px-6 pb-8 max-w-screen-xl mx-auto">
        {/* Type badge */}
        {anime.type && (
          <span className="inline-block mb-2 text-xs font-bold uppercase bg-primary px-2 py-0.5 rounded text-white w-fit">
            {anime.type}
          </span>
        )}

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white line-clamp-2 max-w-2xl leading-tight">
          {anime.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {anime.rating && (
            <span className="text-yellow-400 text-sm font-medium flex items-center gap-1">
              ⭐ {anime.rating}
            </span>
          )}
          {anime.status && (
            <span className="text-green-400 text-sm">
              {anime.status.toLowerCase() === 'ongoing' ? '● Sedang Tayang' : '✓ Selesai'}
            </span>
          )}
          {anime.genres && anime.genres.length > 0 && (
            <span className="text-gray-300 text-sm">{anime.genres.slice(0, 3).join(' · ')}</span>
          )}
        </div>

        {/* Synopsis */}
        {anime.synopsis && (
          <p className="text-gray-300 text-sm mt-2 line-clamp-2 max-w-xl leading-relaxed">
            {anime.synopsis}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <Link
            href={`/anime/${anime.slug}`}
            className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Tonton Sekarang
          </Link>
          <Link
            href={`/anime/${anime.slug}`}
            className="flex items-center gap-2 bg-white/20 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-white/30 transition-colors text-sm backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Info Lebih Lanjut
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Skeleton ─────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="relative w-full h-[56vw] min-h-[280px] max-h-[520px] skeleton">
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 space-y-3">
        <div className="h-4 skeleton rounded w-16" />
        <div className="h-8 skeleton rounded w-72 sm:w-96" />
        <div className="h-4 skeleton rounded w-48" />
        <div className="h-3 skeleton rounded w-80 max-w-full" />
        <div className="flex gap-3 mt-4">
          <div className="h-10 skeleton rounded-lg w-36" />
          <div className="h-10 skeleton rounded-lg w-36" />
        </div>
      </div>
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [ongoing, setOngoing] = useState<Anime[]>([]);
  const [complete, setComplete] = useState<Anime[]>([]);
  const [movies, setMovies] = useState<Anime[]>([]);
  const [popular, setPopular] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ongoingRes, completeRes, popularRes, moviesRes] = await Promise.allSettled([
        api.getOngoing(),
        api.getComplete(),
        api.getPopular(),
        api.getMovies(),
      ]);

      if (ongoingRes.status === 'fulfilled') {
        setOngoing(Array.isArray(ongoingRes.value.data) ? ongoingRes.value.data : []);
      }
      if (completeRes.status === 'fulfilled') {
        setComplete(Array.isArray(completeRes.value.data) ? completeRes.value.data : []);
      }
      if (popularRes.status === 'fulfilled') {
        setPopular(Array.isArray(popularRes.value.data) ? popularRes.value.data : []);
      }
      if (moviesRes.status === 'fulfilled') {
        setMovies(Array.isArray(moviesRes.value.data) ? moviesRes.value.data : []);
      }

      // Error if all failed
      if (
        ongoingRes.status === 'rejected' &&
        completeRes.status === 'rejected' &&
        popularRes.status === 'rejected' &&
        moviesRes.status === 'rejected'
      ) {
        setError('Gagal memuat data. Periksa koneksi internet Anda.');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const heroAnime = ongoing[0] ?? popular[0] ?? null;
  const recentlyUpdated = [...ongoing].slice(0, 20);

  return (
    <div>
      {/* Hero */}
      {loading ? (
        <HeroSkeleton />
      ) : heroAnime ? (
        <HeroBanner anime={heroAnime} />
      ) : null}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Content sections */}
      <div className="py-6 space-y-8">
        {/* Continue watching */}
        <ContinueWatching />

        {/* Ongoing */}
        <AnimeRow
          title="Sedang Tayang"
          animes={ongoing}
          loading={loading}
          seeAllHref="/search?status=ongoing"
        />

        {/* Recently updated */}
        {recentlyUpdated.length > 0 && (
          <AnimeRow
            title="Terbaru Di-update"
            animes={recentlyUpdated}
            loading={loading}
          />
        )}

        {/* Popular */}
        <AnimeRow
          title="Populer"
          animes={popular}
          loading={loading}
          seeAllHref="/search?sort=popular"
        />

        {/* Anime Movie */}
        {movies.length > 0 && (
          <AnimeRow
            title="Anime Movie"
            animes={movies}
            loading={loading}
            seeAllHref="/search?type=Movie"
          />
        )}

        {/* Complete */}
        <AnimeRow
          title="Anime Selesai"
          animes={complete}
          loading={loading}
          seeAllHref="/search?status=complete"
        />
      </div>
    </div>
  );
}
