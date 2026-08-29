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
  // Ad-shield: absorbs the first tap on the iframe so the ad redirect is consumed
  const [adShieldActive, setAdShieldActive] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentServer = normalizedServers[activeServerIdx] ?? normalizedServers[0];
  const currentStreams = currentServer?.streams ?? [];

  useEffect(() => {
    if (currentStreams.length > 0) {
      setActiveQuality(pickBestQuality(currentStreams));
    }
  }, [activeServerIdx, currentStreams.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-arm ad shield whenever server/quality changes
  useEffect(() => {
    setAdShieldActive(true);
  }, [activeServerIdx, activeQuality]);

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

  // Handle ad-shield tap: first tap absorbs the ad click, second tap goes through
  const handleAdShieldClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdShieldActive(false);
  };

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
      <div className="bg-black rounded-2xl sm:rounded-2xl rounded-none overflow-hidden border border-[#222] sm:border md:border shadow-2xl">
        {/* ── Video / Embed Area ── */}
        {/* Mobile-optimized: wider aspect ratio container, no horizontal padding cut */}
        <div className={`relative w-full bg-black ${theaterMode ? 'max-h-[85vh]' : ''}`}
          style={{ aspectRatio: '16 / 9' }}
        >
          {isEmbed ? (
            <>
              <iframe
                key={renderedUrl}
                src={renderedUrl}
                title={title}
                allowFullScreen
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
                className="absolute inset-0 w-full h-full border-0"
                style={{ minHeight: '100%', minWidth: '100%' }}
              />
              {/* ── Ad-Shield Overlay ── 
                  Absorbs the FIRST tap/click so the iframe's injected ad-redirect 
                  opens nothing. After one tap it disappears so the real player 
                  controls underneath become interactive. */}
              {adShieldActive && (
                <div
                  className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
                  onClick={handleAdShieldClick}
                  onTouchEnd={handleAdShieldClick}
                >
                  <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 text-center max-w-[80%] pointer-events-none">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                      <span className="text-white font-bold text-sm sm:text-base">Ketuk untuk Memutar</span>
                    </div>
                    <p className="text-gray-400 text-[10px] sm:text-xs">
                      Ketuk sekali di sini untuk mulai, iklan akan diblokir
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : currentUrl.match(/\.(mp4|webm|ogg|m3u8)(\?|$)/i) ? (
            <video
              ref={videoRef}
              key={currentUrl}
              src={currentUrl}
              controls
              playsInline
              className="absolute inset-0 w-full h-full"
              title={title}
              style={{ minHeight: '100%', minWidth: '100%' }}
            >
              Browser Anda tidak mendukung pemutar video.
            </video>
          ) : (
            <>
              <iframe
                key={renderedUrl}
                src={renderedUrl}
                title={title}
                allowFullScreen
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
                className="absolute inset-0 w-full h-full border-0"
                style={{ minHeight: '100%', minWidth: '100%' }}
              />
              {adShieldActive && (
                <div
                  className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
                  onClick={handleAdShieldClick}
                  onTouchEnd={handleAdShieldClick}
                >
                  <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 text-center max-w-[80%] pointer-events-none">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                      <span className="text-white font-bold text-sm sm:text-base">Ketuk untuk Memutar</span>
                    </div>
                    <p className="text-gray-400 text-[10px] sm:text-xs">
                      Ketuk sekali di sini untuk mulai, iklan akan diblokir
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Mobile: Compact Toolbar ── */}
        {/* Scrollable on small screens so nothing is cut off */}
        <div className="bg-[#111] px-3 sm:px-4 py-2 sm:py-2.5 border-t border-[#1e1e1e]">
          {/* Top row: server info + controls */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-gray-400 text-[11px] sm:text-xs truncate">
                {currentServer?.server} · <strong className="text-emerald-400 font-bold">{activeQuality}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {normalizedServers.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextServer}
                  className="text-[10px] sm:text-[11px] text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 sm:px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-semibold whitespace-nowrap"
                  title="Ganti server"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Ganti Server</span>
                </button>
              )}

              {/* Re-arm ad shield button */}
              {!adShieldActive && (
                <button
                  type="button"
                  onClick={() => setAdShieldActive(true)}
                  className="text-[10px] sm:text-[11px] text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/40 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-semibold whitespace-nowrap"
                  title="Aktifkan kembali anti-iklan"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="hidden sm:inline">Anti-Iklan</span>
                </button>
              )}

              {prevEpisodeSlug && (
                <Link
                  href={`/episode/${prevEpisodeSlug}`}
                  className="px-2 py-1 rounded-lg bg-[#181818] hover:bg-[#222] border border-[#333] text-gray-300 text-[11px] font-semibold flex items-center gap-0.5 transition-colors whitespace-nowrap"
                >
                  ◀ <span className="hidden sm:inline">Prev</span>
                </Link>
              )}

              {nextEpisodeSlug && (
                <Link
                  href={`/episode/${nextEpisodeSlug}`}
                  className="px-2 sm:px-3 py-1 rounded-lg bg-primary hover:bg-primary-dark text-white text-[11px] font-bold flex items-center gap-0.5 transition-colors shadow-md shadow-primary/20 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Next</span> ▶
                </Link>
              )}

              {/* Theater mode - hidden on very small screens */}
              <button
                type="button"
                onClick={() => setTheaterMode(!theaterMode)}
                className={`hidden sm:flex p-1.5 rounded-lg border transition-colors ${
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
        </div>

        {/* ── Controls Panel (Server + Quality selectors) ── */}
        {/* Collapsible on mobile to save screen space */}
        <div className="bg-[#0d0d0d] border-t border-[#1a1a1a]">
          <button
            type="button"
            onClick={() => setShowControls(!showControls)}
            className="sm:hidden w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <span className="font-semibold">Server & Resolusi</span>
            <svg className={`w-4 h-4 transition-transform ${showControls ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`p-4 space-y-4 ${showControls ? 'block' : 'hidden sm:block'}`}>
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
                    className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
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
                    className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 ${
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
    </div>
  );
}
