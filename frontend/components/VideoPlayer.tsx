'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface VideoPlayerProps {
  servers: any[];
  title: string;
  onProgress?: (percent: number) => void;
}

// Domains that ARE safe to embed as iframes (they allow X-Frame-Options: ALLOW)
const EMBED_DOMAINS = [
  'embed', 'player', 'stream',
  'filemoon', 'vidplay', 'vidstream', 'mp4upload', 'streamtape',
  'doodstream', 'dood', 'streamsb', 'sbplay',
  'sendvid', 'streamwish', 'blogger.com',
  // Universal HD players
  'vidsrc.me', 'vidsrc.pm', 'vidsrc.in', 'vidsrc.net',
];

// Domains that block iframe embedding (X-Frame-Options: DENY/SAMEORIGIN)
// These should NEVER be rendered as iframes in our player
const BLOCKED_EMBED_DOMAINS = [
  'desustream', 'desudrive', 'desu60', 'desufast',
  'okstream', 'okestream', 'shinobicdn',
  'yourupload', 'mixdrop', 'vidoza', 'upstream',
  'mega.nz', 'mediafire', 'gdrive', 'drive.google',
  'zippyshare', 'kumpulbagi', 'racaty', 'hxfile',
];

function isEmbedUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Never embed blocked domains
    if (BLOCKED_EMBED_DOMAINS.some(d => host.includes(d))) return false;
    return EMBED_DOMAINS.some((d) => host.includes(d) || u.pathname.includes(d));
  } catch {
    return url.includes('embed') || url.includes('player') || url.startsWith('http');
  }
}

// Also used to check if a URL is safe to show in the player at all
function isPlayableUrl(url: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !BLOCKED_EMBED_DOMAINS.some(d => host.includes(d));
  } catch {
    return true;
  }
}


function getPreferredQuality(streams: { quality: string; url: string }[]): string {
  const preferred = ['1080p', '720p', '480p', '360p', 'HD'];
  for (const q of preferred) {
    const found = streams.find((s) => s.quality.toLowerCase() === q.toLowerCase());
    if (found) return found.quality;
  }
  return streams[0]?.quality ?? '';
}

export default function VideoPlayer({ servers = [], title, onProgress }: VideoPlayerProps) {
  // Normalize whatever format the backend returns into standard { server, streams: [{ quality, url }] }
  const normalizedServers = useMemo(() => {
    if (!Array.isArray(servers)) return [];
    return servers
      .map((s, idx) => {
        // Format 1: standard { server: string, streams: [{ quality, url }] }
        if (s.server && Array.isArray(s.streams)) {
          return {
            server: s.server,
            // Filter out blocked domains (desustream, etc.) at component level too
            streams: s.streams.filter((st: any) => st && st.url && isPlayableUrl(st.url)),
          };
        }
        // Format 2: { label: string, embedUrl: string }
        if (s.embedUrl) {
          return {
            server: s.label || `Server ${idx + 1}`,
            streams: [{ quality: 'HD', url: s.embedUrl }],
          };
        }
        // Format 3: { quality: string, url: string }
        if (s.url) {
          return {
            server: s.host || s.server || `Server ${idx + 1}`,
            streams: [{ quality: s.quality || 'HD', url: s.url }],
          };
        }
        return { server: `Server ${idx + 1}`, streams: [] };
      })
      .filter((s) => s.streams.length > 0);
  }, [servers]);

  const [selectedServer, setSelectedServer] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentServer = normalizedServers[selectedServer] || normalizedServers[0];
  const currentStreams = currentServer?.streams ?? [];

  // Set default quality when server changes
  useEffect(() => {
    if (currentStreams.length > 0) {
      setSelectedQuality(getPreferredQuality(currentStreams));
    }
  }, [selectedServer, currentStreams]);

  const currentUrl =
    currentStreams.find((s) => s.quality.toLowerCase() === selectedQuality.toLowerCase())?.url ??
    currentStreams[0]?.url ??
    '';

  const isEmbed = isEmbedUrl(currentUrl);

  // Track progress for native video
  useEffect(() => {
    if (isEmbed || !videoRef.current) return;
    const video = videoRef.current;

    const handleTimeUpdate = () => {
      if (!video.duration) return;
      const percent = (video.currentTime / video.duration) * 100;
      if (onProgress) onProgress(Math.round(percent));
    };

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(handleTimeUpdate, 5000);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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
          if (document.fullscreenElement) document.exitFullscreen();
          else video.requestFullscreen();
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

  if (!normalizedServers || normalizedServers.length === 0 || !currentUrl) {
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
      {/* Video / Embed Player */}
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
        ) : (
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
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-[#0d0d0d] border-t border-[#1a1a1a] p-3.5 space-y-3">
        {/* Server tabs */}
        {normalizedServers.length > 1 && (
          <div>
            <p className="text-gray-500 text-[11px] mb-1.5 uppercase tracking-wider font-semibold">Pilih Server Player</p>
            <div className="flex flex-wrap gap-2">
              {normalizedServers.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedServer(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedServer === i
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white border border-[#333]'
                  }`}
                >
                  {s.server}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quality selector */}
        {currentStreams.length > 1 && (
          <div>
            <p className="text-gray-500 text-[11px] mb-1.5 uppercase tracking-wider font-semibold">Kualitas Video</p>
            <div className="flex flex-wrap gap-2">
              {currentStreams.map((stream) => (
                <button
                  key={stream.quality}
                  onClick={() => setSelectedQuality(stream.quality)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedQuality.toLowerCase() === stream.quality.toLowerCase()
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white border border-[#333]'
                  }`}
                >
                  {stream.quality}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        {!isEmbed && (
          <p className="text-gray-600 text-[10px]">
            Pintasan: Spasi=Play/Pause · F=Fullscreen · M=Mute · ←/→=±10 detik
          </p>
        )}
      </div>
    </div>
  );
}
