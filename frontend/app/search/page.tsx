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
  { value: 'relevance', label: 'Paling Relevan' },
  { value: 'rating', label: 'Skor Tertinggi ⭐' },
  { value: 'az', label: 'Nama (A-Z)' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Anime[]>([]);
  const [popularAnime, setPopularAnime] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<{ name: string; slug: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('Semua');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterType, setFilterType] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [sortBy, setSortBy] = useState('relevance');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load genres and popular fallback
  useEffect(() => {
    api.getGenres().then((res) => {
      if (Array.isArray(res.data)) {
        setGenres(res.data);
      }
    }).catch(() => {});

    api.getPopular().then((res) => {
      if (Array.isArray(res.data)) {
        setPopularAnime(res.data.slice(0, 12));
      }
    }).catch(() => {});
  }, []);

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

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
    inputRef.current?.focus();
  }, [initialQuery, performSearch]);

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
  const displayList = hasSearched ? results : popularAnime;
  const filteredResults = displayList
    .filter((a) => {
      if (filterType !== 'Semua' && a.type?.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterStatus !== 'Semua' && a.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      if (selectedGenre !== 'Semua') {
        const genreList = Array.isArray(a.genres) ? a.genres : [];
        if (!genreList.some((g) => g.toLowerCase().includes(selectedGenre.toLowerCase()))) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'az') return a.title.localeCompare(b.title);
      if (sortBy === 'rating') {
        const ra = parseFloat(a.rating ?? '0');
        const rb = parseFloat(b.rating ?? '0');
        return rb - ra;
      }
      return 0;
    });

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-8 bg-primary rounded-full" />
        <h1 className="text-white text-2xl sm:text-3xl font-black">
          Cari & Filter Anime
        </h1>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative mb-6">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Ketik judul anime, genre, atau karakter..."
          className="w-full bg-[#121212] border border-[#262626] focus:border-primary text-white placeholder-gray-500 text-sm sm:text-base rounded-2xl px-5 py-4 pl-12 focus:outline-none transition-all shadow-xl"
        />
        <button
          type="submit"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
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

      {/* Multi-Filters bar */}
      <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 mb-8 space-y-3.5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Format / Type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Format:</span>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`text-xs px-3 py-1 rounded-xl font-semibold transition-all ${
                    filterType === t
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2e2e2e]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Status:</span>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`text-xs px-3 py-1 rounded-xl font-semibold transition-all ${
                    filterStatus === s
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2e2e2e]'
                  }`}
                >
                  {s === 'Complete' ? 'Selesai' : s === 'Ongoing' ? 'Tayang' : 'Semua'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#202020]">
          {/* Genre dropdown */}
          {genres.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Genre:</span>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] text-gray-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary font-medium"
              >
                <option value="Semua">Semua Genre</option>
                {genres.map((g) => (
                  <option key={g.slug} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Urutan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] text-gray-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary font-medium"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-xs sm:text-sm font-medium">
          {hasSearched ? (
            <>Menampilkan <strong className="text-white">{filteredResults.length}</strong> hasil untuk &quot;{query}&quot;</>
          ) : (
            <>Rekomendasi Anime Populer Saat Ini</>
          )}
        </p>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
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
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center text-gray-600 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-base mb-1">Tidak Ada Anime Yang Cocok</h3>
          <p className="text-gray-500 text-xs max-w-sm">
            Coba ubah kata kunci pencarian atau sesuaikan opsi filter format/genre di atas.
          </p>
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
