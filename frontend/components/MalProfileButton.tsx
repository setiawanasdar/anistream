'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMalAuth } from '@/lib/hooks/useMalAuth';
import MalAuthModal from './MalAuthModal';

export default function MalProfileButton() {
  const { isAuthenticated, user, logout } = useMalAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2e51a2]/20 hover:bg-[#2e51a2]/30 border border-[#2e51a2]/50 text-[#8ba7f0] text-xs font-semibold transition-all hover:scale-105"
        >
          <div className="w-4 h-4 rounded bg-[#2e51a2] flex items-center justify-center text-[10px] text-white font-black">
            M
          </div>
          <span className="hidden sm:inline">Hubungkan MAL</span>
          <span className="sm:hidden">MAL</span>
        </button>

        <MalAuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222] border border-[#333] transition-colors"
      >
        <div className="relative w-6 h-6 rounded-full overflow-hidden bg-[#2e51a2] flex-shrink-0">
          {user.picture ? (
            <Image
              src={user.picture}
              alt={user.name}
              fill
              sizes="24px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white text-[10px]">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-white text-xs font-medium max-w-[90px] truncate hidden sm:inline">
          {user.name}
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Tersambung ke MAL" />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
          {/* User info */}
          <div className="p-3.5 border-b border-[#222] bg-[#181818]">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[#2e51a2] flex-shrink-0">
                {user.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-bold truncate">{user.name}</p>
                <p className="text-[#8ba7f0] text-[10px] flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  MyAnimeList Connected
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="p-1.5 space-y-0.5 text-xs">
            <Link
              href="/watchlist"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Watchlist & Riwayat MAL
            </Link>

            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl transition-colors text-left"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Putuskan Sambungan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
