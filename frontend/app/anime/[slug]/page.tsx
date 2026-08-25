'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AnimeDetail, Episode } from '@/lib/api';
import GenreTag from '@/components/GenreTag';
import EpisodeList from '@/components/EpisodeList';
import WatchlistButton from '@/components/WatchlistButton';
import SourceBadge from '@/components/SourceBadge';
import { formatRating, normalizeStatus, getStatusColor } from '@/lib/utils';

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero */}
      <div className="w-full h-64 sm:h-80 skeleton" />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          <div className="hidden sm:block w-44 h-64 skeleton rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-7 skeleton rounded w-3/4" />
            <div className="h-4 skeleton rounded w-1/2" />
            <div className="flex gap-2 mt-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-6 skeleton rounded-full w-16" />)}
            </div>
            <div className="space-y-2 mt-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-3 skeleton rounded" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Anime Detail Page ─────────────────────────────────────────────────────────

export default function AnimeDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const fetchAnime = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAnimeDetail(slug);
      setAnime(res.data);
    } catch {
      setError('Gagal memuat detail anime. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnime();
  }, [slug]);

  if (loading) return <DetailSkeleton />;

  if (error || !anime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-white text-xl font-bold mb-2">Anime Tidak Ditemukan</h2>
        <p className="text-gray-400 mb-6">{error ?? 'Anime yang kamu cari tidak tersedia.'}</p>
        <div className="flex gap-3">
          <button onClick={fetchAnime} className="bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors">
            Coba Lagi
          </button>
          <Link href="/" className="bg-[#1a1a1a] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#222] transition-colors border border-[#333]">
            Beranda
          </Link>
        </div>
      </div>
    );
  }

  const synopsis = anime.synopsis ?? '';
  const synopsisTruncated = synopsis.length > 200 && !synopsisExpanded
    ? synopsis.slice(0, 200) + '...'
    : synopsis;

  const episodes: Episode[] = anime.episodes_list ?? [];
  const firstEpisode = episodes[episodes.length - 1]; // usually oldest

  return (
    <div>
      {/* Hero backdrop */}
      <div className="relative w-full h-64 sm:h-80 overflow-hidden">
        <Image
          src={anime.backdrop ?? anime.poster}
          alt={anime.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-top blur-sm scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      </div>

      {/* Main content */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 -mt-32 relative z-10 pb-10">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Poster */}
          <div className="flex-shrink-0 w-36 sm:w-44 mx-auto sm:mx-0">
            <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden border-2 border-[#333] shadow-2xl">
              <Image
                src={anime.poster}
                alt={anime.title}
                fill
                sizes="(max-width: 640px) 144px, 176px"
                className="object-cover"
                unoptimized
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2 sm:pt-10">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {anime.title}
            </h1>
            {anime.alt_title && (
              <p className="text-gray-400 text-sm mt-1">{anime.alt_title}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {anime.status && (
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusColor(anime.status)}`}>
                  {normalizeStatus(anime.status)}
                </span>
              )}
              {anime.type && (
                <span className="text-xs px-2.5 py-1 rounded-full border bg-primary/20 text-primary-light border-primary/30 font-medium">
                  {anime.type}
                </span>
              )}
              {anime.rating && (
                <span className="text-xs flex items-center gap-1 text-yellow-400 font-medium">
                  ⭐ {formatRating(anime.rating)}
                </span>
              )}
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 text-sm">
              {anime.studio && (
                <div>
                  <span className="text-gray-500">Studio: </span>
                  <span className="text-gray-200">{anime.studio}</span>
                </div>
              )}
              {anime.year && (
                <div>
                  <span className="text-gray-500">Tahun: </span>
                  <span className="text-gray-200">{anime.year}</span>
                </div>
              )}
              {anime.episodes && (
                <div>
                  <span className="text-gray-500">Episode: </span>
                  <span className="text-gray-200">{anime.episodes}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {anime.genres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {anime.genres.map((g) => (
                  <GenreTag key={g} genre={g} slug={g.toLowerCase().replace(/\s+/g, '-')} />
                ))}
              </div>
            )}

            {/* Synopsis */}
            {synopsis && (
              <div className="mt-4">
                <p className="text-gray-300 text-sm leading-relaxed">{synopsisTruncated}</p>
                {synopsis.length > 200 && (
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    className="text-primary-light text-xs mt-1 hover:text-primary transition-colors"
                  >
                    {synopsisExpanded ? 'Tampilkan lebih sedikit' : 'Selengkapnya'}
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-5">
              {firstEpisode && (
                <Link
                  href={`/episode/${firstEpisode.slug}`}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Mulai Nonton
                </Link>
              )}
              <WatchlistButton anime={anime} />
              {anime.source && <SourceBadge source={anime.source} />}
            </div>
          </div>
        </div>

        {/* Episode list */}
        {episodes.length > 0 && (
          <div className="mt-8">
            <EpisodeList episodes={episodes} animeSlug={slug} />
          </div>
        )}
      </div>
    </div>
  );
}
