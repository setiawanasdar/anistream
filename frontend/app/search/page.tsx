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

const ITEMS_PER_PAGE = 30;

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';
  const initialType = searchParams.get('type') ?? 'Semua';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Anime[]>([]);
  // Master catalog — loaded once from /api/anime/catalog (200+ items)
  const [catalog, setCatalog] = useState<Anime[]>([]);
  // Extra items appended per Load More
  const [extraItems, setExtraItems] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<{ name: string; slug: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('Semua');
  const [genrePage, setGenrePage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterType, setFilterType] = useState(initialType);
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [sortBy, setSortBy] = useState('relevance');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load full catalog from /api/anime/catalog (200+ anime in one shot) ──
  useEffect(() => {
    // Load genres in parallel
    api.getGenres().then((res) => {
      if (Array.isArray(res.data)) setGenres(res.data);
    }).catch(() => {});

    const loadCatalog = async () => {
      setLoading(true);
      try {
        // Primary: single /catalog call that aggregates 200+ items server-side
        const catalogRes = await api.getCatalog();
        if (Array.isArray(catalogRes.data) && catalogRes.data.length > 10) {
          setCatalog(catalogRes.data);
          setCatalogLoaded(true);
          setLoading(false);
          return;
        }
      } catch { /* ignore */ }

      // Fallback: parallel individual calls
      try {
        const [ongoingRes, completeRes, moviesRes, popularRes] = await Promise.allSettled([
          api.getOngoing(),
          api.getComplete(),
          api.getMovies(1),
          api.getPopular(),
        ]);

        const lists = [ongoingRes, completeRes, moviesRes, popularRes]
          .filter((r) => r.status === 'fulfilled')
          .map((r) => (r as PromiseFulfilledResult<{ data: Anime[] }>).value.data)
          .filter(Array.isArray);

        const map = new Map<string, Anime>();
        lists.flat().forEach((item) => {
          if (!item?.slug && !item?.id) return;
          const key = (item.slug || item.id).toLowerCase();
          if (!map.has(key)) map.set(key, item);
        });
        setCatalog(Array.from(map.values()));
        setCatalogLoaded(true);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  // ── When Movie tab selected, ensure we have movies in the catalog ──
  const ensureMovies = useCallback(async () => {
    try {
      const res = await api.getMovies(1);
      const movies = Array.isArray(res.data) ? res.data : [];
      if (movies.length === 0) return;
      setCatalog((prev) => {
        const map = new Map<string, Anime>(prev.map((a) => [(a.slug || a.id).toLowerCase(), a]));
        movies.forEach((item) => {
          const key = (item.slug || item.id).toLowerCase();
          if (!map.has(key)) map.set(key, item);
        });
        return Array.from(map.values());
      });
    } catch { /* ignore */ }
  }, []);

  // ── Genre fetch (on-demand when user picks a genre) ──
  const handleGenreChange = useCallback(async (genreName: string) => {
    setSelectedGenre(genreName);
    setVisibleCount(ITEMS_PER_PAGE);
    setGenrePage(1);
    setExtraItems([]);
    if (genreName === 'Semua') return;

    const matched = genres.find((g) => g.name === genreName || g.slug === genreName);
    const genreSlug = matched ? matched.slug : genreName.toLowerCase().replace(/\s+/g, '-');

    setGenreLoading(true);
    try {
      const res = await api.getGenreAnime(genreSlug, 1);
      const list = Array.isArray(res.data) ? res.data : [];
      setExtraItems(list);
    } catch { /* ignore */ } finally {
      setGenreLoading(false);
    }
  }, [genres]);

  // ── Load More ──
  const handleLoadMore = useCallback(async () => {
    if (selectedGenre !== 'Semua') {
      const matched = genres.find((g) => g.name === selectedGenre || g.slug === selectedGenre);
      const genreSlug = matched ? matched.slug : selectedGenre.toLowerCase().replace(/\s+/g, '-');
      const nextPage = genrePage + 1;
      setGenreLoading(true);
      try {
        const res = await api.getGenreAnime(genreSlug, nextPage);
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) {
          setGenrePage(nextPage);
          setExtraItems((prev) => {
            const map = new Map<string, Anime>(prev.map((a) => [(a.slug || a.id).toLowerCase(), a]));
            list.forEach((item) => {
              const key = (item.slug || item.id).toLowerCase();
              if (!map.has(key)) map.set(key, item);
            });
            return Array.from(map.values());
          });
        }
      } catch { /* ignore */ } finally {
        setGenreLoading(false);
      }
    } else if (filterType === 'Movie') {
      const nextPage = genrePage + 1;
      setGenreLoading(true);
      try {
        const res = await api.getMovies(nextPage);
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) {
          setGenrePage(nextPage);
          setExtraItems((prev) => {
            const map = new Map<string, Anime>(prev.map((a) => [(a.slug || a.id).toLowerCase(), a]));
            list.forEach((item) => {
              const key = (item.slug || item.id).toLowerCase();
              if (!map.has(key)) map.set(key, item);
            });
            return Array.from(map.values());
          });
        }
      } catch { /* ignore */ } finally {
        setGenreLoading(false);
      }
    }
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  }, [selectedGenre, filterType, genrePage, genres]);

  // ── Handle type/format change ──
  const handleTypeChange = useCallback((t: string) => {
    setFilterType(t);
    setVisibleCount(ITEMS_PER_PAGE);
    setExtraItems([]);
    setGenrePage(1);
    if (t === 'Movie') {
      ensureMovies();
    }
  }, [ensureMovies]);

  // ── Search ──
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    setVisibleCount(ITEMS_PER_PAGE);
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
    if (initialQuery) performSearch(initialQuery);
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
    if (query.trim()) router.replace(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  // ── Build final display list ──
  // Source priority: search results > extra genre items merged with catalog
  const baseCatalog = selectedGenre !== 'Semua' && extraItems.length > 0
    ? (() => {
        const map = new Map<string, Anime>(extraItems.map((a) => [(a.slug || a.id).toLowerCase(), a]));
        catalog.forEach((a) => {
          const key = (a.slug || a.id).toLowerCase();
          if (!map.has(key)) map.set(key, a);
        });
        return Array.from(map.values());
      })()
    : filterType === 'Movie' && extraItems.length > 0
    ? (() => {
        const map = new Map<string, Anime>(extraItems.map((a) => [(a.slug || a.id).toLowerCase(), a]));
        catalog.forEach((a) => {
          const key = (a.slug || a.id).toLowerCase();
          if (!map.has(key)) map.set(key, a);
        });
        return Array.from(map.values());
      })()
    : catalog;

  const rawList = hasSearched ? results : baseCatalog;

  const filteredResults = rawList
    .filter((a) => {
      // Type filter
      if (filterType !== 'Semua') {
        const itemType = (a.type || 'TV').toUpperCase();
        const filterUpper = filterType.toUpperCase();
        if (filterUpper === 'MOVIE') {
          const isMovie = itemType.includes('MOVIE') || itemType.includes('FILM')
            || (a.title || '').toUpperCase().includes(' MOVIE')
            || (a.genres || []).some((g) => g.toUpperCase().includes('MOVIE'));
          if (!isMovie) return false;
        } else {
          if (!itemType.includes(filterUpper)) return false;
        }
      }
      // Status filter
      if (filterStatus !== 'Semua') {
        const s = (a.status || '').toLowerCase();
        if (filterStatus === 'Complete') {
          if (!s.includes('complet') && !s.includes('tamat') && !s.includes('selesai')) return false;
        } else if (filterStatus === 'Ongoing') {
          if (!s.includes('ongo') && !s.includes('tayan') && !s.includes('rilis')) return false;
        }
      }
      // Genre filter (if using catalog, not direct genre fetch)
      if (selectedGenre !== 'Semua' && extraItems.length === 0) {
        const genreList = Array.isArray(a.genres) ? a.genres : [];
        if (genreList.length > 0 && !genreList.some((g) => g.toLowerCase().includes(selectedGenre.toLowerCase()))) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'az') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'rating') return (parseFloat(b.rating ?? '0') - parseFloat(a.rating ?? '0'));
      return 0;
    });

  const displayedAnime = filteredResults.slice(0, visibleCount);
  const hasMore = visibleCount < filteredResults.length || selectedGenre !== 'Semua' || filterType === 'Movie';

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 min-h-[85vh]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-8 bg-primary rounded-full" />
        <div>
          <h1 className="text-white text-2xl sm:text-3xl font-black">Eksplorasi & Cari Anime</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {catalogLoaded
              ? `${catalog.length}+ anime tersedia — serial TV, Movie, OVA, ONA subtitle Indonesia`
              : 'Memuat koleksi anime...'}
          </p>
        </div>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative mb-6">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Ketik judul anime, genre, atau kata kunci apa saja..."
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

      {/* Filters */}
      <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 sm:p-5 mb-8 space-y-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Format / Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Format:</span>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
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

          {/* Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Status:</span>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setFilterStatus(s); setVisibleCount(ITEMS_PER_PAGE); }}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    filterStatus === s
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2e2e2e]'
                  }`}
                >
                  {s === 'Complete' ? 'Selesai' : s === 'Ongoing' ? 'Sedang Tayang' : 'Semua'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3.5 border-t border-[#202020]">
          {/* Genre */}
          {genres.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Genre:</span>
              <select
                value={selectedGenre}
                onChange={(e) => handleGenreChange(e.target.value)}
                className="bg-[#1a1a1a] border border-[#333] text-gray-200 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-primary font-medium"
              >
                <option value="Semua">Semua Genre</option>
                {genres.map((g) => (
                  <option key={g.slug} value={g.name}>{g.name}</option>
                ))}
              </select>
              {genreLoading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Urutan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] text-gray-200 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-primary font-medium"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-gray-400 text-xs sm:text-sm font-medium">
          {hasSearched ? (
            <>Menampilkan <strong className="text-white">{displayedAnime.length}</strong>/{filteredResults.length} hasil untuk &quot;{query}&quot;</>
          ) : (
            <>
              Menampilkan <strong className="text-white">{displayedAnime.length}</strong>/
              <strong className="text-white">{filteredResults.length}</strong> anime
              {filterType !== 'Semua' && <> · <span className="text-primary">{filterType}</span></>}
              {filterStatus !== 'Semua' && <> · <span className="text-emerald-400">{filterStatus}</span></>}
              {selectedGenre !== 'Semua' && <> · <span className="text-yellow-400">{selectedGenre}</span></>}
            </>
          )}
        </p>
      </div>

      {/* Results Grid */}
      {loading && displayedAnime.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
        </div>
      ) : displayedAnime.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedAnime.map((anime) => (
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

          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={genreLoading}
                className="px-8 py-3 bg-[#181818] hover:bg-primary hover:text-white border border-[#2e2e2e] text-gray-200 text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-lg hover:scale-105 disabled:opacity-50"
              >
                {genreLoading ? 'Memuat...' : 'Muat Lebih Banyak Anime ▾'}
              </button>
            </div>
          )}
        </>
      ) : catalogLoaded ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center text-gray-600 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-base mb-1">Tidak Ada Anime Yang Cocok</h3>
          <p className="text-gray-500 text-xs max-w-sm">
            Coba sesuaikan filter format/genre atau gunakan kata kunci pencarian yang berbeda.
          </p>
          <button
            onClick={() => { setFilterType('Semua'); setFilterStatus('Semua'); setSelectedGenre('Semua'); }}
            className="mt-4 text-xs text-primary hover:underline"
          >
            Reset semua filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
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
          {Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
