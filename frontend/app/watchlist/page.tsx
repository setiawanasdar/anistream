'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import { useContinueWatching } from '@/lib/hooks/useContinueWatching';
import { useSupabaseAuth } from '@/lib/hooks/useSupabaseAuth';
import AnimeCard from '@/components/AnimeCard';
import AuthModal from '@/components/AuthModal';

type TabType = 'watchlist' | 'history';

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist, clearWatchlist, syncedWithCloud: watchlistSynced } = useWatchlist();
  const { list: historyList, removeItem: removeHistoryItem, clearAll: clearHistory, syncedWithCloud: historySynced } = useContinueWatching();
  const { isAuthenticated, user } = useSupabaseAuth();

  const [activeTab, setActiveTab] = useState<TabType>('watchlist');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 min-h-[80vh]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
        <span>/</span>
        <span className="text-white font-medium">Watchlist & Riwayat</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-primary rounded-full" />
          <div>
            <h1 className="text-white text-2xl sm:text-3xl font-black">
              Daftar Tontonan & Riwayat
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Simpan anime favorit dan lanjutkan tontonan Anda kapan saja
            </p>
          </div>
        </div>

        {/* Cloud Sync / Auth Status */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 bg-[#161616] border border-[#2a2a2a] px-3.5 py-2 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs">
              <p className="text-white font-bold">{displayName}</p>
              <p className="text-emerald-400 text-[10px] flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Supabase Cloud Sync Aktif
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-primary/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Masuk untuk Cloud Sync
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#222] pb-3 mb-6 scrollbar-none">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'watchlist'
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-[#161616] text-gray-400 hover:text-white hover:bg-[#202020]'
          }`}
        >
          <span>⭐ Watchlist Saya</span>
          <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px]">
            {watchlist.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-[#161616] text-gray-400 hover:text-white hover:bg-[#202020]'
          }`}
        >
          <span>📺 Riwayat Tontonan</span>
          <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px]">
            {historyList.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Watchlist */}
      {activeTab === 'watchlist' && (
        <div>
          {watchlist.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-gray-400">
                  {watchlist.length} Anime tersimpan {watchlistSynced && '• Tersinkron di Cloud'}
                </span>
                <button
                  onClick={clearWatchlist}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Hapus Semua Watchlist
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {watchlist.map((anime) => (
                  <div key={anime.id || anime.slug} className="relative group">
                    <AnimeCard
                      id={anime.id}
                      title={anime.title}
                      slug={anime.slug}
                      poster={anime.poster}
                      type={anime.type}
                      status={anime.status}
                      episodes={anime.episodes}
                      rating={anime.rating}
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromWatchlist(anime.id || anime.slug);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      title="Hapus dari Watchlist"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center text-gray-600 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-base mb-1">Watchlist Masih Kosong</h3>
              <p className="text-gray-500 text-xs max-w-sm mb-6">
                Klik tombol bookmark pada halaman detail anime untuk menyimpannya ke daftar tontonan Anda.
              </p>
              <Link
                href="/"
                className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Jelajahi Anime
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: History (Continue Watching) */}
      {activeTab === 'history' && (
        <div>
          {historyList.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-gray-400">
                  {historyList.length} Episode terakhir ditonton {historySynced && '• Tersinkron di Cloud'}
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Hapus Semua Riwayat
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {historyList.map((item) => (
                  <div
                    key={item.episodeSlug}
                    className="relative group bg-[#141414] border border-[#222] rounded-xl overflow-hidden flex flex-col hover:border-primary/60 transition-all"
                  >
                    <Link
                      href={`/episode/${item.episodeSlug}`}
                      className="relative aspect-video w-full block overflow-hidden bg-black"
                    >
                      {item.poster && (
                        <Image
                          src={item.poster}
                          alt={item.animeTitle}
                          fill
                          sizes="200px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                          ▶
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, Math.max(5, item.progress))}%` }}
                        />
                      </div>
                    </Link>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <Link
                          href={`/anime/${item.animeSlug}`}
                          className="text-white text-xs font-bold line-clamp-1 hover:text-primary-light transition-colors"
                        >
                          {item.animeTitle}
                        </Link>
                        <p className="text-gray-400 text-[11px] mt-0.5 truncate">
                          {item.episodeTitle}
                        </p>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <Link
                          href={`/episode/${item.episodeSlug}`}
                          className="text-primary-light text-[11px] font-semibold hover:underline"
                        >
                          Lanjutkan ▶
                        </Link>
                        <span className="text-[10px] text-gray-500">
                          {item.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeHistoryItem(item.episodeSlug);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      title="Hapus riwayat"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center text-gray-600 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-base mb-1">Belum Ada Riwayat Tontonan</h3>
              <p className="text-gray-500 text-xs max-w-sm mb-6">
                Episode yang Anda tonton akan otomatis tercatat di sini dan tersinkronisasi.
              </p>
              <Link
                href="/"
                className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Mulai Nonton
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
