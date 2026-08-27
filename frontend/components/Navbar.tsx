'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Anime } from '@/lib/api';
import Image from 'next/image';
import UserProfileButton from './UserProfileButton';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/schedule', label: 'Jadwal' },
    { href: '/search', label: 'Eksplor' },
    { href: '/watchlist', label: 'Watchlist' },
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

  // Keep-alive heartbeat ping to prevent Render free-tier sleep while active
  useEffect(() => {
    const pingBackend = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://anistream-9e2v.onrender.com';
      fetch(`${apiUrl}/health`, { method: 'GET', keepalive: true }).catch(() => {});
    };

    pingBackend();
    const interval = setInterval(pingBackend, 8 * 60 * 1000); // every 8 minutes
    return () => clearInterval(interval);
  }, []);

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
    if (searchQuery.trim()) {
      setShowDropdown(false);
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleRandomAnime = async () => {
    if (randomLoading) return;
    setRandomLoading(true);
    try {
      const res = await api.getPopular();
      const list = Array.isArray(res.data) && res.data.length > 0 ? res.data : (await api.getOngoing()).data;
      if (Array.isArray(list) && list.length > 0) {
        const randomIndex = Math.floor(Math.random() * list.length);
        const randomItem = list[randomIndex];
        if (randomItem?.slug) {
          router.push(`/anime/${randomItem.slug}`);
        }
      }
    } catch {
      // fallback to search
      router.push('/search');
    } finally {
      setRandomLoading(false);
      setMenuOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/85 border-b border-[#1a1a1a]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center font-black text-white text-base shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
            A
          </div>
          <span className="text-white font-black text-lg tracking-tight">
            Ani<span className="text-primary-light">Stream</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'text-white bg-white/10 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Random Anime button */}
          <button
            type="button"
            onClick={handleRandomAnime}
            disabled={randomLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 transition-all border border-amber-900/40 ml-1"
            title="Pilih Anime Acak"
          >
            <span>🎲</span>
            <span>{randomLoading ? 'Memilih...' : 'Acak'}</span>
          </button>
        </div>

        {/* Right side: Search + Profile + Mobile toggle */}
        <div className="flex items-center gap-2.5">
          {/* Expandable Search bar */}
          <div ref={searchRef} className="relative">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Cari anime..."
                  className="w-48 sm:w-64 bg-[#141414] border border-primary text-white text-xs rounded-xl px-3.5 py-1.5 pl-8 focus:outline-none placeholder-gray-500 shadow-xl"
                />
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchLoading && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Dropdown search results */}
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#121212] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <>
                        <div className="p-2 divide-y divide-[#1e1e1e]">
                          {searchResults.map((anime) => (
                            <Link
                              key={anime.id || anime.slug}
                              href={`/anime/${anime.slug}`}
                              onClick={() => {
                                setShowDropdown(false);
                                setSearchOpen(false);
                              }}
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors group"
                            >
                              <div className="relative w-9 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a]">
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
                                <p className="text-white text-xs font-semibold truncate group-hover:text-primary-light transition-colors">
                                  {anime.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {anime.type && (
                                    <span className="text-[10px] text-primary-light font-medium">{anime.type}</span>
                                  )}
                                  {anime.rating && (
                                    <span className="text-[10px] text-yellow-400 font-medium">⭐ {anime.rating}</span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-primary/20 hover:bg-primary text-primary-light hover:text-white text-xs font-bold text-center transition-colors border-t border-[#222]"
                        >
                          Lihat semua hasil untuk &quot;{searchQuery}&quot;
                        </button>
                      </>
                    ) : (
                      <div className="p-4 text-center text-gray-400 text-xs">
                        Tidak ada hasil untuk &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
                aria-label="Buka pencarian"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>

          {/* Supabase User Profile / Login Button */}
          <UserProfileButton />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
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
      </div>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0d0d0d] border-t border-[#1a1a1a] px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                pathname === link.href
                  ? 'text-white bg-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleRandomAnime}
            disabled={randomLoading}
            className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-400 hover:bg-amber-950/30 transition-colors"
          >
            <span>🎲</span>
            <span>{randomLoading ? 'Memilih...' : 'Pilih Anime Acak'}</span>
          </button>
        </div>
      )}
    </nav>
  );
}
