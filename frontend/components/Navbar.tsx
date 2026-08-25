'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Anime } from '@/lib/api';
import Image from 'next/image';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/schedule', label: 'Jadwal' },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus();
  }, [searchOpen]);

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.searchAnime(value);
        const results = Array.isArray(res.data) ? res.data.slice(0, 8) : [];
        setSearchResults(results);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowDropdown(false);
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setSearchOpen(false);
    }
  };

  const handleResultClick = (slug: string) => {
    setShowDropdown(false);
    setSearchOpen(false);
    setSearchQuery('');
    router.push(`/anime/${slug}`);
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/80 border-b border-[#1a1a1a]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-4">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center font-black text-white text-sm">
            A
          </div>
          <span className="text-white font-bold text-lg tracking-tight">AniStream</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-white bg-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1 md:flex-none" />

        {/* Search */}
        <div ref={searchRef} className="relative flex items-center">
          {searchOpen ? (
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cari anime..."
                className="w-44 sm:w-64 bg-[#1a1a1a] border border-[#333] text-white placeholder-gray-500 text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="absolute right-2 text-gray-400 hover:text-white"
                aria-label="Cari"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Dropdown results */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-lg shadow-2xl overflow-hidden z-50">
                  {searchLoading ? (
                    <div className="p-3 text-center text-gray-400 text-sm">Mencari...</div>
                  ) : searchResults.length > 0 ? (
                    <>
                      {searchResults.map((anime) => (
                        <button
                          key={anime.slug}
                          onClick={() => handleResultClick(anime.slug)}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="relative w-8 h-12 flex-shrink-0 rounded overflow-hidden bg-surface">
                            {anime.poster && (
                              <Image
                                src={anime.poster}
                                alt={anime.title}
                                fill
                                sizes="32px"
                                className="object-cover"
                                unoptimized
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{anime.title}</p>
                            <p className="text-gray-500 text-xs">{anime.type} · {anime.status}</p>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={handleSearchSubmit as unknown as React.MouseEventHandler}
                        className="w-full p-2.5 text-primary-light text-sm text-center hover:bg-white/5 border-t border-[#222]"
                      >
                        Lihat semua hasil untuk &quot;{searchQuery}&quot;
                      </button>
                    </>
                  ) : (
                    <div className="p-3 text-center text-gray-400 text-sm">
                      Tidak ada hasil untuk &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Buka pencarian"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0d0d0d] border-t border-[#1a1a1a] px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-white bg-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
