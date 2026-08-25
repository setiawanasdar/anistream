'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Server } from '@/lib/api';

interface VideoPlayerProps {
  servers: Server[];
  title: string;
  onProgress?: (percent: number) => void;
}

const EMBED_DOMAINS = [
  'embed', 'player', 'stream', 'drive.google', 'gdrive', 'mp4upload',
  'streamtape', 'doodstream', 'filemoon', 'vidplay', 'mega.nz',
  'okru', 'yourupload', 'krakenfiles', 'files.fm', 'sbplay',
];

function isEmbedUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return EMBED_DOMAINS.some((d) => u.hostname.includes(d) || u.pathname.includes(d));
  } catch {
    return url.includes('embed') || url.includes('player') || url.includes('iframe');
  }
}

function getPreferredQuality(streams: Server['streams']): string {
  const preferred = ['1080p', '720p', '480p', '360p'];
  for (const q of preferred) {
    const found = streams.find((s) => s.quality === q);
    if (found) return found.quality;
  }
  return streams[0]?.quality ?? '';
}

export default function VideoPlayer({ servers, title, onProgress }: VideoPlayerProps) {
  const [selectedServer, setSelectedServer] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentServer = servers[selectedServer];
  const currentStreams = currentServer?.streams ?? [];

  // Set default quality when server changes
  useEffect(() => {
    if (currentStreams.length > 0) {
      setSelectedQuality(getPreferredQuality(currentStreams));
    }
  }, [selectedServer, currentStreams]);

  const currentUrl = currentStreams.find((s) => s.quality === selectedQuality)?.url
    ?? currentStreams[0]?.url
    ?? '';

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
      // Don't trigger if user is in an input
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

  if (!servers || servers.length === 0) {
    return (
      <div className="video-container flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Tidak ada sumber video tersedia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black">
      {/* Video */}
      <div className="video-container">
        {isEmbed ? (
          <iframe
            src={currentUrl}
            title={title}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
            className="w-full h-full border-0"
          />
        ) : (
          <video
            ref={videoRef}
            key={currentUrl}
            src={currentUrl}
            controls
            className="w-full h-full"
            title={title}
          >
            Browser Anda tidak mendukung pemutar video.
          </video>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-[#0d0d0d] border-t border-[#1a1a1a] p-3 space-y-3">
        {/* Server tabs */}
        {servers.length > 1 && (
          <div>
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Server</p>
            <div className="flex flex-wrap gap-2">
              {servers.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedServer(i)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    selectedServer === i
                      ? 'bg-primary text-white'
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
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Kualitas</p>
            <div className="flex flex-wrap gap-2">
              {currentStreams.map((stream) => (
                <button
                  key={stream.quality}
                  onClick={() => setSelectedQuality(stream.quality)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    selectedQuality === stream.quality
                      ? 'bg-primary text-white'
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
          <p className="text-gray-700 text-[10px]">
            Pintasan: Spasi=Play/Pause · F=Fullscreen · M=Mute · ←/→=±10 detik
          </p>
        )}
      </div>
    </div>
  );
}
