'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import type { Anime } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import AnimeCardSkeleton from '@/components/AnimeCardSkeleton';

const TYPES = ['Semua', 'TV', 'Movie', 'OVA', 'ONA', 'Special'];
const STATUSES = ['Semua', 'Ongoing', 'Complete'];
const SORTS = [
  { value: 'relevance', label: 'Relevansi' },
  { value: 'az', label: 'A-Z' },
  { value: 'rating', label: 'Rating' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterType, setFilterType] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [sortBy, setSortBy] = useState('relevance');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.searchAnime(q);
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search on mount if q param exists
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
      router.replace(value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : '/search');
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(query);
    if (query.trim()) {
      router.replace(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  // Filter + sort
  const filteredResults = results
    .filter((a) => {
      if (filterType !== 'Semua' && a.type?.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterStatus !== 'Semua' && a.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'az') return a.title.localeCompare(b.title);
      if (sortBy === 'rating') {
        const ra = parseFloat(a.rating ?? '0');
        const rb = parseFloat(b.rating ?? '0');
        return rb - ra;
      }
      return 0; // relevance = original order
    });

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <h1 className="text-white text-2xl sm:text-3xl font-black mb-6">Cari Anime</h1>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative mb-6">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Ketik nama anime..."
          className="w-full bg-[#111] border border-[#222] focus:border-primary text-white placeholder-gray-500 text-base rounded-xl px-5 py-4 pl-12 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          aria-label="Cari"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Filters */}
      {hasSearched && (
        <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-[#1a1a1a]">
          {/* Type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Tipe:</span>
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filterType === t
                    ? 'bg-primary text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Status:</span>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filterStatus === s
                    ? 'bg-primary text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-primary"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : hasSearched ? (
        filteredResults.length > 0 ? (
          <>
            <p className="text-gray-500 text-sm mb-4">
              {filteredResults.length} hasil untuk &quot;{query}&quot;
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredResults.map((anime) => (
                <AnimeCard
                  key={anime.id || anime.slug}
                  id={anime.id}
                  title={anime.title}
                  slug={anime.slug}
                  poster={anime.poster}
                  type={anime.type}
                  status={anime.status}
                  episodes={anime.episodes}
                  rating={anime.rating}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-white font-bold text-lg mb-2">Tidak Ada Hasil</h3>
            <p className="text-gray-400 text-sm">
              Tidak ada anime untuk &quot;{query}&quot;. Coba kata kunci lain.
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500 text-sm">Masukkan nama anime untuk mencari</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 skeleton rounded w-48 mb-6" />
        <div className="h-14 skeleton rounded-xl mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
