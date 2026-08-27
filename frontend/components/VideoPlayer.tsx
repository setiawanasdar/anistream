'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface VideoPlayerProps {
  servers: any[];
  title: string;
  onProgress?: (percent: number) => void;
  prevEpisodeSlug?: string;
  nextEpisodeSlug?: string;
}

// Domains whose /embed/ URLs are safe to iframe
const EMBED_SAFE_HOSTS = [
  'filedon.co',
  'vidhidepro.com',
  'vidhidepre.com',
  'odvidhide.com',
  'vidhide.com',
  'vidiade.com',
  'filemoon.sx',
  'filemoon.to',
  'vidplay.site',
  'vidplay.online',
  'mp4upload.com',
  'streamtape.com',
  'doodstream.com',
  'streamsb.net',
  'sbplay.org',
  'sendvid.com',
  'streamwish.to',
  'streamwish.com',
  'blogger.com',
  'google.com',
  'vidlink.pro',
  'smashystream.com',
  '2embed.skin',
  '2embed.cc',
  '2embed.org',
  '2embed.me',
  'vidsrc.me',
  'vidsrc.pm',
  'vidsrc.in',
  'vidsrc.net',
  'vidsrc.xyz',
  'mega.nz',
];

// Domains that BLOCK iframe embedding — never render these
const BLOCKED_HOSTS = [
  'desustream.net',
  'desudrive',
  'desu60',
  'desufast',
  'okstream',
  'okestream',
  'shinobicdn',
  'yourupload',
  'mixdrop',
  'vidoza',
  'upstream',
  'mediafire',
  'drive.google.com',
  'zippyshare',
  'kumpulbagi',
  'racaty',
  'hxfile',
];

function normalizeStreamUrl(url: string): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\/(vidiade\.com|vidhide\.com|vidhidepre\.com|odvidhide\.com)\/embed\//i, 'https://vidhidepro.com/embed/');
}

function isEmbeddable(url: string): boolean {
  if (!url || !url.startsWith('http')) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    if (BLOCKED_HOSTS.some((b) => host.includes(b))) return false;
    if (host.includes('mega.nz')) {
      return path.startsWith('/embed/') || path.startsWith('/embed#');
    }
    if (EMBED_SAFE_HOSTS.some((s) => host.includes(s))) return true;
    if (path.includes('/embed') || path.includes('/player')) return true;

    return false;
  } catch {
    return false;
  }
}

function isPlayableUrl(url: string): boolean {
  if (!url || !url.startsWith('http')) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    if (BLOCKED_HOSTS.some((b) => host.includes(b))) return false;
    if (host.includes('mega.nz') && !path.startsWith('/embed')) return false;

    return true;
  } catch {
    return false;
  }
}

const QUALITY_ORDER = ['1080p', '720p', '480p', '360p', 'HD'] as const;

function pickBestQuality(streams: { quality: string; url: string }[]): string {
  for (const q of QUALITY_ORDER) {
    if (streams.some((s) => s.quality.toUpperCase() === q.toUpperCase())) return q;
  }
  return streams[0]?.quality ?? 'HD';
}

export default function VideoPlayer({
  servers = [],
  title,
  onProgress,
  prevEpisodeSlug,
  nextEpisodeSlug,
}: VideoPlayerProps) {
  const normalizedServers = useMemo(() => {
    if (!Array.isArray(servers)) return [];
    return servers
      .map((s, idx) => {
        if (s.server && Array.isArray(s.streams)) {
          return {
            server: s.server as string,
            streams: (s.streams as any[]).filter((st) => st?.url && isPlayableUrl(st.url)),
          };
        }
        if (s.embedUrl && isPlayableUrl(s.embedUrl)) {
          return {
            server: (s.label || `Server ${idx + 1}`) as string,
            streams: [{ quality: 'HD', url: s.embedUrl as string }],
          };
        }
        if (s.url && isPlayableUrl(s.url)) {
          return {
            server: (s.host || s.server || `Server ${idx + 1}`) as string,
            streams: [{ quality: (s.quality || 'HD') as string, url: s.url as string }],
          };
        }
        return { server: `Server ${idx + 1}`, streams: [] as { quality: string; url: string }[] };
      })
      .filter((s) => s.streams.length > 0);
  }, [servers]);

  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeQuality, setActiveQuality] = useState('');
  const [theaterMode, setTheaterMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentServer = normalizedServers[activeServerIdx] ?? normalizedServers[0];
  const currentStreams = currentServer?.streams ?? [];

  useEffect(() => {
    if (currentStreams.length > 0) {
      setActiveQuality(pickBestQuality(currentStreams));
    }
  }, [activeServerIdx, currentStreams.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentUrl =
    currentStreams.find((s) => s.quality.toUpperCase() === activeQuality.toUpperCase())?.url ??
    currentStreams[0]?.url ??
    '';

  const isEmbed = isEmbeddable(currentUrl);
  const renderedUrl = normalizeStreamUrl(currentUrl);

  const handleNextServer = () => {
    if (normalizedServers.length > 1) {
      setActiveServerIdx((prev) => (prev + 1) % normalizedServers.length);
    }
  };

  // Native progress tracking
  useEffect(() => {
    if (isEmbed || !videoRef.current) return;
    const video = videoRef.current;
    const tick = () => {
      if (!video.duration) return;
      onProgress?.(Math.round((video.currentTime / video.duration) * 100));
    };
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(tick, 5000);
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isEmbed, onProgress, currentUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || isEmbed) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case 'f':
          e.preventDefault();
          document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen();
          break;
        case 't':
          e.preventDefault();
          setTheaterMode((prev) => !prev);
          break;
        case 'm':
          e.preventDefault();
          video.muted = !video.muted;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isEmbed]);

  if (!normalizedServers.length || !currentUrl) {
    return (
      <div className="video-container flex items-center justify-center bg-black aspect-video rounded-xl overflow-hidden border border-[#222]">
        <div className="text-center text-gray-400 p-6">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-30 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-white mb-1">Sumber Video Sedang Diproses</p>
          <p className="text-xs text-gray-500">Pilih episode lain atau gunakan link download di bawah.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full transition-all duration-300 ${theaterMode ? 'max-w-none' : ''}`}>
      <div className="bg-black rounded-2xl overflow-hidden border border-[#222] shadow-2xl">
        {/* ── Video / Embed Area ── */}
        <div className={`video-container relative aspect-video bg-black ${theaterMode ? 'max-h-[85vh]' : ''}`}>
          {isEmbed ? (
            <iframe
              key={renderedUrl}
              src={renderedUrl}
              title={title}
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
              className="w-full h-full border-0 absolute inset-0"
            />
          ) : currentUrl.match(/\.(mp4|webm|ogg|m3u8)(\?|$)/i) ? (
            <video
              ref={videoRef}
              key={currentUrl}
              src={currentUrl}
              controls
              className="w-full h-full absolute inset-0"
              title={title}
            >
              Browser Anda tidak mendukung pemutar video.
            </video>
          ) : (
            <iframe
              key={renderedUrl}
              src={renderedUrl}
              title={title}
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
              className="w-full h-full border-0 absolute inset-0"
            />
          )}
        </div>

        {/* ── Action Toolbar (Theater mode, Switch server, Next ep) ── */}
        <div className="bg-[#111] px-4 py-2.5 border-t border-[#1e1e1e] flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-gray-400">
              {currentServer?.server} • <strong className="text-emerald-400 font-bold">{activeQuality}</strong>
            </span>

            {normalizedServers.length > 1 && (
              <button
                type="button"
                onClick={handleNextServer}
                className="ml-2 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                title="Pindah ke server cadangan berikutnya jika pemutar macet"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Ganti Server Cadangan
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Next/Prev buttons in toolbar */}
            {prevEpisodeSlug && (
              <Link
                href={`/episode/${prevEpisodeSlug}`}
                className="px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#222] border border-[#333] text-gray-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                title="Episode Sebelumnya"
              >
                ◀ Prev
              </Link>
            )}

            {nextEpisodeSlug && (
              <Link
                href={`/episode/${nextEpisodeSlug}`}
                className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-dark text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-md shadow-primary/20"
                title="Episode Selanjutnya"
              >
                Next ▶
              </Link>
            )}

            {/* Theater mode button */}
            <button
              type="button"
              onClick={() => setTheaterMode(!theaterMode)}
              className={`p-1.5 rounded-lg border transition-colors ${
                theaterMode
                  ? 'bg-primary/20 border-primary text-primary-light'
                  : 'bg-[#181818] border-[#333] text-gray-400 hover:text-white'
              }`}
              title={theaterMode ? 'Keluar Mode Bioskop (T)' : 'Mode Bioskop (T)'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Controls Panel ── */}
        <div className="bg-[#0d0d0d] border-t border-[#1a1a1a] p-4 space-y-4">
          {/* Server Selector */}
          <div>
            <p className="text-gray-500 text-[11px] mb-2 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
              Pilih Server ({normalizedServers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {normalizedServers.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveServerIdx(i)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeServerIdx === i
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-1 ring-primary/50'
                      : 'bg-[#161616] text-gray-400 hover:bg-[#222] hover:text-white border border-[#2a2a2a]'
                  }`}
                >
                  {s.server}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Selector */}
          <div>
            <p className="text-gray-500 text-[11px] mb-2 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              Resolusi
            </p>
            <div className="flex flex-wrap gap-2">
              {currentStreams.map((stream) => (
                <button
                  key={stream.quality + stream.url}
                  onClick={() => setActiveQuality(stream.quality)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeQuality.toUpperCase() === stream.quality.toUpperCase()
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-500/50'
                      : 'bg-[#161616] text-gray-400 hover:bg-[#222] hover:text-white border border-[#2a2a2a]'
                  }`}
                >
                  {stream.quality}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
