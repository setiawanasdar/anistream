'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { DaySchedule } from '@/lib/api';
import Image from 'next/image';

interface ScheduleTableProps {
  schedule: DaySchedule[];
}

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'];

function getCurrentDayName(): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()];
}

export default function ScheduleTable({ schedule = [] }: ScheduleTableProps) {
  const [activeDay, setActiveDay] = useState('');

  // Normalize day names
  const normalizedSchedule = useMemo(() => {
    if (!Array.isArray(schedule)) return [];
    return schedule.map((s) => {
      const raw = (s.day || '').trim();
      const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      return {
        ...s,
        day: cap,
        animes: s.animes || [],
      };
    });
  }, [schedule]);

  useEffect(() => {
    if (normalizedSchedule.length === 0) return;
    const today = getCurrentDayName();
    const hasTodayData = normalizedSchedule.some((s) => s.day === today);
    setActiveDay(hasTodayData ? today : normalizedSchedule[0]?.day ?? '');
  }, [normalizedSchedule]);

  // Sort schedule by day order
  const sortedSchedule = useMemo(() => {
    return [...normalizedSchedule].sort((a, b) => {
      const idxA = DAY_ORDER.indexOf(a.day);
      const idxB = DAY_ORDER.indexOf(b.day);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });
  }, [normalizedSchedule]);

  const activeAnimes = sortedSchedule.find((s) => s.day === activeDay)?.animes ?? [];

  if (normalizedSchedule.length === 0) {
    return (
      <div className="bg-card border border-[#222] rounded-xl p-8 text-center text-gray-500">
        Jadwal tidak tersedia saat ini.
      </div>
    );
  }

  return (
    <div className="bg-card border border-[#222] rounded-xl overflow-hidden shadow-xl">
      {/* Day tabs */}
      <div className="flex overflow-x-auto scroll-container border-b border-[#1a1a1a] bg-[#0f0f0f]">
        {sortedSchedule.map((day) => {
          const isToday = day.day === getCurrentDayName();
          const isActive = day.day === activeDay;
          return (
            <button
              key={day.day}
              onClick={() => setActiveDay(day.day)}
              className={`flex-shrink-0 px-5 py-3.5 text-sm font-medium transition-all relative ${
                isActive
                  ? 'text-white font-bold bg-white/5'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {day.day}
                {isToday && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Hari ini" />
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-normal ml-1">
                  {day.animes.length}
                </span>
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Anime list */}
      <div className="divide-y divide-[#181818]">
        {activeAnimes.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Tidak ada jadwal anime untuk hari {activeDay}.
          </div>
        ) : (
          activeAnimes.map((anime, i) => (
            <Link
              key={`${anime.slug}-${i}`}
              href={`/anime/${anime.slug}`}
              className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group"
            >
              {/* Poster or Icon */}
              <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a] border border-[#262626]">
                {anime.poster ? (
                  <Image
                    src={anime.poster}
                    alt={anime.title}
                    fill
                    sizes="48px"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate group-hover:text-primary-light transition-colors">
                  {anime.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                    {anime.episode || 'Rilis Mingguan'}
                  </span>
                  {anime.time && (
                    <span className="text-xs text-gray-500">
                      Pukul {anime.time}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-primary flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
