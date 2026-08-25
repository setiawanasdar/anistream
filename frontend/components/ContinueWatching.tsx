'use client';

import { useContinueWatching } from '@/lib/hooks/useContinueWatching';
import Link from 'next/link';
import Image from 'next/image';

export default function ContinueWatching() {
  const { list, removeItem } = useContinueWatching();

  if (list.length === 0) return null;

  const displayList = list.slice(0, 6);

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-4 sm:px-6">
        <h2 className="text-white font-bold text-lg sm:text-xl flex items-center gap-2">
          <span className="w-1 h-5 bg-green-500 rounded-full inline-block" />
          Lanjutkan Menonton
        </h2>
      </div>

      <div className="scroll-container flex gap-3 px-4 sm:px-6 pb-2">
        {displayList.map((item) => (
          <div
            key={item.episodeSlug}
            className="relative flex-shrink-0 w-[200px] sm:w-[220px] group"
          >
            {/* Remove button */}
            <button
              onClick={() => removeItem(item.episodeSlug)}
              className="absolute top-1.5 left-1.5 z-10 w-6 h-6 bg-black/70 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
              aria-label="Hapus"
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <Link href={`/episode/${item.episodeSlug}`}>
              {/* Thumbnail - 16/9 */}
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-card border border-[#222] group-hover:border-primary/50 transition-colors">
                {item.poster ? (
                  <Image
                    src={item.poster}
                    alt={item.animeTitle}
                    fill
                    sizes="220px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-surface flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Progress bar */}
                {item.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, item.progress)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-1.5 px-0.5">
                <p className="text-white text-xs font-medium truncate">{item.animeTitle}</p>
                <p className="text-gray-500 text-[10px] mt-0.5 truncate">{item.episodeTitle}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
