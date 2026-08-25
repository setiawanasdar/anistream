'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DaySchedule } from '@/lib/api';
import ScheduleTable from '@/components/ScheduleTable';

function ScheduleSkeleton() {
  return (
    <div className="bg-card border border-[#222] rounded-xl overflow-hidden animate-pulse">
      {/* Tab skeleton */}
      <div className="flex border-b border-[#1a1a1a] px-4 py-3 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-5 skeleton rounded w-12" />
        ))}
      </div>
      {/* Items skeleton */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 border-b border-[#111]">
          <div className="w-10 h-14 skeleton rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-3 skeleton rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSchedule();
      const data = Array.isArray(res.data) ? res.data : [];
      setSchedule(data);
    } catch {
      setError('Gagal memuat jadwal. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-8 bg-primary rounded-full" />
        <div>
          <h1 className="text-white text-2xl sm:text-3xl font-black">Jadwal Tayang Mingguan</h1>
          <p className="text-gray-500 text-sm mt-0.5">Anime yang tayang setiap minggunya</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <ScheduleSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-white font-bold text-lg mb-2">Jadwal Tidak Tersedia</h3>
          <p className="text-gray-400 text-sm mb-5">{error}</p>
          <button
            onClick={fetchSchedule}
            className="bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      ) : schedule.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400">Jadwal belum tersedia saat ini.</p>
        </div>
      ) : (
        <ScheduleTable schedule={schedule} />
      )}
    </div>
  );
}
