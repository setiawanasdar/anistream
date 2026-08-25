'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { EpisodeDetail } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';
import EpisodeList from '@/components/EpisodeList';
import SourceBadge from '@/components/SourceBadge';
import { useContinueWatching } from '@/lib/hooks/useContinueWatching';

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function EpisodeSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="w-full aspect-video bg-black skeleton" />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 space-y-3">
        <div className="h-6 skeleton rounded w-3/4" />
        <div className="h-4 skeleton rounded w-1/2" />
        <div className="flex gap-3">
          <div className="h-10 skeleton rounded-lg w-32" />
          <div className="h-10 skeleton rounded-lg w-32" />
        </div>
      </div>
    </div>
  );
}

// ─── Episode Page ──────────────────────────────────────────────────────────────

export default function EpisodePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<{ slug: string; title: string; episode_number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [episodeListOpen, setEpisodeListOpen] = useState(false);
  const { updateProgress } = useContinueWatching();

  const fetchEpisode = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEpisode(slug);
      setEpisode(res.data);

      // Also load anime detail for episode list
      if (res.data.animeSlug) {
        try {
          const animeRes = await api.getAnimeDetail(res.data.animeSlug);
          if (animeRes.data.episodes_list) {
            setAllEpisodes(animeRes.data.episodes_list);
          }
        } catch {
          // Ignore, episode list is optional
        }
      }
    } catch {
      setError('Gagal memuat episode. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisode();
  }, [slug]);

  const handleProgress = useCallback(
    (percent: number) => {
      if (!episode) return;
      updateProgress({
        episodeSlug: slug,
        animeSlug: episode.animeSlug,
        animeTitle: episode.anime,
        episodeTitle: episode.title,
        poster: '', // poster not available at episode level
        progress: percent,
      });
    },
    [episode, slug, updateProgress]
  );

  if (loading) return <EpisodeSkeleton />;

  if (error || !episode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h2 className="text-white text-xl font-bold mb-2">Episode Tidak Tersedia</h2>
        <p className="text-gray-400 mb-6">{error ?? 'Episode tidak ditemukan.'}</p>
        <button
          onClick={fetchEpisode}
          className="bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Video player - full width, black bg */}
      <div className="bg-black w-full">
        <div className="max-w-screen-2xl mx-auto">
          <VideoPlayer
            servers={episode.servers}
            title={episode.title}
            onProgress={handleProgress}
          />
        </div>
      </div>

      {/* Episode info */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5">
        {/* Title & Anime */}
        <div className="space-y-1 mb-4">
          <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight">{episode.title}</h1>
          {episode.anime && (
            <Link
              href={`/anime/${episode.animeSlug}`}
              className="text-primary-light hover:text-primary transition-colors text-sm font-medium"
            >
              ← {episode.anime}
            </Link>
          )}
        </div>

        {/* Source badge */}
        <div className="mb-4">
          <SourceBadge source="Otakudesu" />
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center gap-3 flex-wrap">
          {episode.prev_episode && (
            <Link
              href={`/episode/${episode.prev_episode}`}
              className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#222] text-white text-sm font-medium px-4 py-2.5 rounded-lg border border-[#333] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Episode Sebelumnya
            </Link>
          )}
          {episode.next_episode && (
            <Link
              href={`/episode/${episode.next_episode}`}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              Episode Selanjutnya
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Episode list toggle */}
        {allEpisodes.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setEpisodeListOpen(!episodeListOpen)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3"
            >
              <svg
                className={`w-4 h-4 transition-transform ${episodeListOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {episodeListOpen ? 'Sembunyikan' : 'Tampilkan'} Daftar Episode
            </button>
            {episodeListOpen && (
              <EpisodeList
                episodes={allEpisodes}
                currentSlug={slug}
                animeSlug={episode.animeSlug}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
