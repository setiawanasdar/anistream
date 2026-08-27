'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
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
  const [episode, setEpisode] = useState<any | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<{ slug: string; title: string; episode_number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [episodeListOpen, setEpisodeListOpen] = useState(true);
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
          const rawEps: any[] = animeRes.data?.episodes_list || animeRes.data?.episodeList || animeRes.data?.episodes || [];
          if (Array.isArray(rawEps)) {
            setAllEpisodes(
              rawEps.map((ep, idx) => ({
                slug: ep.slug || String(ep.id || idx + 1),
                title: ep.title || `Episode ${ep.episode_number || idx + 1}`,
                episode_number: String(ep.episode_number || idx + 1),
              }))
            );
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
        animeSlug: episode.animeSlug || '',
        animeTitle: episode.anime || episode.title || '',
        episodeTitle: episode.title || '',
        poster: '',
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

  const prevEp = episode.prev_episode || episode.prevEpisode;
  const nextEp = episode.next_episode || episode.nextEpisode;
  const downloads = Array.isArray(episode.downloads) ? episode.downloads : [];

  return (
    <div>
      {/* Video player - full width, black bg */}
      <div className="bg-black w-full">
        <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 py-3">
          <VideoPlayer
            servers={episode.servers || []}
            title={episode.title || ''}
            onProgress={handleProgress}
            prevEpisodeSlug={episode.prev_episode || episode.prevEpisode}
            nextEpisodeSlug={episode.next_episode || episode.nextEpisode}
          />
        </div>
      </div>

      {/* Episode info & content */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {/* Title & Anime */}
        <div className="space-y-1 mb-4">
          <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight">{episode.title}</h1>
          {episode.anime && episode.animeSlug && (
            <Link
              href={`/anime/${episode.animeSlug}`}
              className="text-primary-light hover:text-primary transition-colors text-sm font-medium inline-block mt-1"
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
        <div className="flex items-center gap-3 flex-wrap mb-8">
          {prevEp && (
            <Link
              href={`/episode/${prevEp}`}
              className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#222] text-white text-sm font-medium px-4 py-2.5 rounded-lg border border-[#333] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Episode Sebelumnya
            </Link>
          )}
          {nextEp && (
            <Link
              href={`/episode/${nextEp}`}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              Episode Selanjutnya
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Download Section (Separated from player) */}
        {downloads.length > 0 && (
          <div className="bg-card border border-[#222] rounded-xl p-5 mb-8 shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1a1a1a]">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <h3 className="text-white font-bold text-base">Download Episode & Link Alternatif</h3>
            </div>

            <div className="space-y-3">
              {downloads.map((dl: any, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-[#161616] rounded-lg border border-[#262626]"
                >
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-primary/20 text-primary-light border border-primary/30 w-fit">
                    {dl.quality}
                  </span>

                  <div className="flex flex-wrap gap-2 flex-1">
                    {Array.isArray(dl.links) &&
                      dl.links.map((link: any, lIdx: number) => (
                        <a
                          key={lIdx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#222] hover:bg-primary text-gray-300 hover:text-white transition-colors border border-[#333]"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {link.host}
                        </a>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Episode list */}
        {allEpisodes.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-base">Pilih Episode</h3>
              <button
                onClick={() => setEpisodeListOpen(!episodeListOpen)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {episodeListOpen ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
            {episodeListOpen && (
              <EpisodeList
                episodes={allEpisodes}
                currentSlug={slug}
                animeSlug={episode.animeSlug || ''}
                animeTitle={episode.anime || episode.title || ''}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
