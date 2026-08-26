'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface VideoPlayerProps {
  servers: any[];
  title: string;
  onProgress?: (percent: number) => void;
}

// ---------------------------------------------------------------------------
// Domain classification
// ---------------------------------------------------------------------------

// Domains whose /embed/ URLs are safe to iframe
const EMBED_SAFE_HOSTS = [
  'filedon.co',
  'odvidhide.com',
  'vidhide.com',
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
  // Universal HD Anime players
  'vidlink.pro',
  '2embed.skin',
  '2embed.cc',
  '2embed.org',
  '2embed.me',
  'vidsrc.me',
  'vidsrc.pm',
  'vidsrc.in',
  'vidsrc.net',
  'vidsrc.xyz',
  'mega.nz',           // only /embed/ paths — see guard below
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

/**
 * Decide whether a URL can be loaded inside an <iframe> player.
 * Must be an embed/player URL from a safe host, and NOT a download link.
 */
function isEmbeddable(url: string): boolean {
  if (!url || !url.startsWith('http')) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    // Hard-block known bad hosts
    if (BLOCKED_HOSTS.some((b) => host.includes(b))) return false;

    // mega.nz: only allow /embed/ paths, never /file/ or /#!
    if (host.includes('mega.nz')) {
      return path.startsWith('/embed/') || path.startsWith('/embed#');
    }

    // If the host is in our safe list → embeddable
    if (EMBED_SAFE_HOSTS.some((s) => host.includes(s))) return true;

    // Generic heuristic: URL contains "embed" or "player" in path
    if (path.includes('/embed') || path.includes('/player')) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Is this URL safe to show at all in the player area?
 * Filters out download-only links and blocked hosts.
 */
function isPlayableUrl(url: string): boolean {
  if (!url || !url.startsWith('http')) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    if (BLOCKED_HOSTS.some((b) => host.includes(b))) return false;

    // mega.nz download links (not embed) are not playable in iframe
    if (host.includes('mega.nz') && !path.startsWith('/embed')) return false;

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUALITY_ORDER = ['1080p', '720p', '480p', '360p', 'HD'] as const;

function pickBestQuality(streams: { quality: string; url: string }[]): string {
  for (const q of QUALITY_ORDER) {
    if (streams.some((s) => s.quality.toUpperCase() === q.toUpperCase())) return q;
  }
  return streams[0]?.quality ?? 'HD';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VideoPlayer({ servers = [], title, onProgress }: VideoPlayerProps) {
  // ── normalise all backend formats into { server, streams[] } ──
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

  // ── state ──
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeQuality, setActiveQuality] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived
  const currentServer = normalizedServers[activeServerIdx] ?? normalizedServers[0];
  const currentStreams = currentServer?.streams ?? [];

  // When server changes, pick best quality automatically
  useEffect(() => {
    if (currentStreams.length > 0) {
      setActiveQuality(pickBestQuality(currentStreams));
    }
  }, [activeServerIdx, currentStreams.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve the URL to render
  const currentUrl =
    currentStreams.find((s) => s.quality.toUpperCase() === activeQuality.toUpperCase())?.url ??
    currentStreams[0]?.url ??
    '';

  const isEmbed = isEmbeddable(currentUrl);

  // ── progress tracking for native <video> ──
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

  // ── keyboard shortcuts (native video only) ──
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ── No servers at all → placeholder ──
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
    <div className="w-full bg-black rounded-xl overflow-hidden border border-[#222] shadow-2xl">
      {/* ── Video / Embed Area ── */}
      <div className="video-container relative aspect-video bg-black">
        {isEmbed ? (
          <iframe
            key={currentUrl}
            src={currentUrl}
            title={title}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
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
          /* Fallback: treat unknown URLs as iframe embeds rather than downloads */
          <iframe
            key={currentUrl}
            src={currentUrl}
            title={title}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            className="w-full h-full border-0 absolute inset-0"
          />
        )}
      </div>

      {/* ── Controls Panel ── */}
      <div className="bg-[#0d0d0d] border-t border-[#1a1a1a] p-4 space-y-4">

        {/* ── Server Selector (always visible) ── */}
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
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeServerIdx === i
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-1 ring-primary/50'
                    : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525] hover:text-white border border-[#333]'
                }`}
              >
                {s.server}
              </button>
            ))}
          </div>
        </div>

        {/* ── Quality / Resolution Selector (always visible) ── */}
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
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeQuality.toUpperCase() === stream.quality.toUpperCase()
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-500/50'
                    : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525] hover:text-white border border-[#333]'
                }`}
              >
                {stream.quality}
              </button>
            ))}
          </div>
        </div>

        {/* ── Now Playing info ── */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#1a1a1a]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <p className="text-gray-500 text-[11px]">
            <span className="text-gray-400 font-medium">{currentServer?.server}</span>
            {' · '}
            <span className="text-emerald-400 font-semibold">{activeQuality}</span>
          </p>
        </div>

        {/* ── Keyboard shortcuts ── */}
        {!isEmbed && (
          <p className="text-gray-600 text-[10px]">
            Pintasan: Spasi=Play/Pause · F=Fullscreen · M=Mute · ←/→=±10 detik
          </p>
        )}
      </div>
    </div>
  );
}
