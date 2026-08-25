'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { Anime } from '@/lib/api';

interface AnimeCardProps {
  id: string;
  title: string;
  slug: string;
  poster: string;
  type?: string;
  status?: string;
  episodes?: number;
  rating?: string;
}

export default function AnimeCard({
  id,
  title,
  slug,
  poster,
  type,
  status,
  episodes,
  rating,
}: AnimeCardProps) {
  const [imgError, setImgError] = useState(false);

  const typeColors: Record<string, string> = {
    tv: 'bg-primary text-white',
    movie: 'bg-yellow-600 text-white',
    ova: 'bg-pink-600 text-white',
    ona: 'bg-orange-600 text-white',
    special: 'bg-blue-600 text-white',
  };

  const typeColor = typeColors[(type ?? '').toLowerCase()] ?? 'bg-gray-600 text-white';

  return (
    <Link
      href={`/anime/${slug}`}
      className="anime-card group relative flex-shrink-0 w-[155px] sm:w-[165px] cursor-pointer"
      title={title}
    >
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-card border border-[#222222]">
        {!imgError ? (
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(max-width: 640px) 155px, 165px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface gap-2 px-2">
            <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] text-gray-500 text-center leading-tight">{title}</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="anime-card-overlay absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2">
          <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{title}</p>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {rating && (
              <span className="text-yellow-400 text-[10px] flex items-center gap-0.5">
                ⭐ {rating}
              </span>
            )}
            {episodes && (
              <span className="text-gray-300 text-[10px]">{episodes} Eps</span>
            )}
          </div>
        </div>

        {/* Type badge */}
        {type && (
          <div className="absolute top-1.5 right-1.5">
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${typeColor}`}>
              {type}
            </span>
          </div>
        )}

        {/* Rating badge */}
        {rating && (
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[9px] font-bold bg-black/70 text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              ⭐ {rating}
            </span>
          </div>
        )}
      </div>

      {/* Title below poster */}
      <div className="mt-1.5 px-0.5">
        <p className="text-white text-xs font-medium line-clamp-2 leading-tight group-hover:text-primary-light transition-colors">
          {title}
        </p>
        {status && (
          <p className="text-gray-500 text-[10px] mt-0.5">
            {status.toLowerCase() === 'ongoing' ? 'Tayang' : 'Selesai'}
          </p>
        )}
      </div>
    </Link>
  );
}
