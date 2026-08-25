'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DaySchedule, ScheduleAnime } from '@/lib/api';
import Image from 'next/image';

interface ScheduleTableProps {
  schedule: DaySchedule[];
}

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function getCurrentDayName(): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()];
}

export default function ScheduleTable({ schedule }: ScheduleTableProps) {
  const [activeDay, setActiveDay] = useState('');

  useEffect(() => {
    const today = getCurrentDayName();
    const hasTodayData = schedule.some((s) => s.day === today);
    setActiveDay(hasTodayData ? today : schedule[0]?.day ?? '');
  }, [schedule]);

  // Sort schedule by day order
  const sortedSchedule = [...schedule].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );

  const activeAnimes = sortedSchedule.find((s) => s.day === activeDay)?.animes ?? [];

  if (schedule.length === 0) {
    return (
      <div className="bg-card border border-[#222] rounded-xl p-8 text-center text-gray-500">
        Jadwal tidak tersedia.
      </div>
    );
  }

  return (
    <div className="bg-card border border-[#222] rounded-xl overflow-hidden">
      {/* Day tabs */}
      <div className="flex overflow-x-auto scroll-container border-b border-[#1a1a1a]">
        {sortedSchedule.map((day) => {
          const isToday = day.day === getCurrentDayName();
          const isActive = day.day === activeDay;
          return (
            <button
              key={day.day}
              onClick={() => setActiveDay(day.day)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors relative ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {day.day}
                {isToday && (
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                )}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Anime list */}
      <div className="divide-y divide-[#111]">
        {activeAnimes.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            Tidak ada anime untuk hari ini.
          </div>
        ) : (
          activeAnimes.map((anime, i) => (
            <Link
              key={`${anime.slug}-${i}`}
              href={`/anime/${anime.slug}`}
              className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
            >
              {/* Time */}
              {anime.time && (
                <div className="flex-shrink-0 text-gray-400 text-xs w-10 text-center">
                  {anime.time}
                </div>
              )}

              {/* Poster */}
              <div className="relative w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-surface">
                {anime.poster && (
                  <Image
                    src={anime.poster}
                    alt={anime.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate hover:text-primary-light transition-colors">
                  {anime.title}
                </p>
                {anime.episode && (
                  <p className="text-gray-500 text-xs mt-0.5">
                    Episode {anime.episode}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
