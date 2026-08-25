'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { Anime } from '@/lib/api';

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  fullWidth?: boolean;
}

export default function SearchBar({ initialQuery = '', onSearch, fullWidth = false }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (onSearch) onSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchAnime(value);
        const list = Array.isArray(res.data) ? res.data.slice(0, 8) : [];
        setResults(list);
        setOpen(list.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : 'max-w-md w-full'}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Cari anime..."
          className="w-full bg-[#1a1a1a] border border-[#333] text-white placeholder-gray-500 rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          className="absolute left-3.5 text-gray-400 hover:text-white transition-colors"
          aria-label="Cari"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        {loading && (
          <div className="absolute right-3">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-[#222] rounded-xl shadow-2xl overflow-hidden z-50">
          {results.map((anime) => (
            <button
              key={anime.slug}
              onClick={() => {
                setOpen(false);
                setQuery('');
                router.push(`/anime/${anime.slug}`);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
            >
              <div className="relative w-9 h-12 flex-shrink-0 rounded overflow-hidden bg-surface">
                {anime.poster && (
                  <Image
                    src={anime.poster}
                    alt={anime.title}
                    fill
                    sizes="36px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{anime.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {anime.type} · {anime.status}
                  {anime.rating && ` · ⭐ ${anime.rating}`}
                </p>
              </div>
            </button>
          ))}
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="w-full p-3 text-primary-light text-sm font-medium text-center hover:bg-white/5 border-t border-[#222] transition-colors"
          >
            Lihat semua hasil →
          </button>
        </div>
      )}
    </div>
  );
}
