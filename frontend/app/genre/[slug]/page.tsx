'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Anime } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import AnimeCardSkeleton from '@/components/AnimeCardSkeleton';
import Link from 'next/link';

export default function GenrePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const genreName = slug
    ? slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '';

  const fetchGenre = useCallback(async (pageNum: number, append = false) => {
    if (!slug) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.getGenreAnime(slug, pageNum);
      const raw = res?.data;
      const data: Anime[] = Array.isArray(raw) ? raw : (raw as any)?.results || [];
      if (append) {
        setAnimes((prev) => [...prev, ...data]);
      } else {
        setAnimes(data);
      }
      setHasMore(data.length >= 10);
    } catch {
      setError('Gagal memuat anime genre ini.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchGenre(1, false);
    setPage(1);
  }, [fetchGenre]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchGenre(nextPage, true);
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
        <span>/</span>
        <span className="text-gray-300">Genre</span>
        <span>/</span>
        <span className="text-white font-medium">{genreName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-8 bg-primary rounded-full" />
        <h1 className="text-white text-2xl sm:text-3xl font-black">
          Anime Genre: {genreName}
        </h1>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchGenre(1, false)}
            className="bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : !error && animes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400">Tidak ada anime untuk genre &quot;{genreName}&quot;.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animes.map((anime) => (
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
            {loadingMore && Array.from({ length: 6 }).map((_, i) => <AnimeCardSkeleton key={`more-${i}`} />)}
          </div>

          {/* Load More */}
          {hasMore && !loadingMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                className="bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#333] hover:border-primary px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Muat Lebih Banyak
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
