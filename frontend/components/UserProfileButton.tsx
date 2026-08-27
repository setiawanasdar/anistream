'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSupabaseAuth } from '@/lib/hooks/useSupabaseAuth';
import AuthModal from './AuthModal';

export default function UserProfileButton() {
  const { isAuthenticated, user, signOut, isConfigured } = useSupabaseAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return (
      <div className="w-16 h-7 rounded-xl bg-[#181818] border border-[#2a2a2a] animate-pulse" />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all shadow-md shadow-primary/20 hover:scale-105"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Masuk</span>
        </button>

        <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222] border border-[#333] transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center font-bold text-white text-[11px] flex-shrink-0">
          {initial}
        </div>
        <span className="text-white text-xs font-medium max-w-[90px] truncate hidden sm:inline">
          {displayName}
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Tersambung ke Supabase Cloud" />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden z-[999] animate-fadeIn">
          {/* User info */}
          <div className="p-3.5 border-b border-[#222] bg-[#181818]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-bold truncate">{displayName}</p>
                <p className="text-gray-400 text-[10px] truncate">{user.email}</p>
                <p className="text-emerald-400 text-[9px] flex items-center gap-1 font-medium mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Cloud Sync Aktif
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
              Watchlist & Riwayat Nonton
            </Link>

            <button
              onClick={() => {
                setDropdownOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl transition-colors text-left"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar Akun
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
