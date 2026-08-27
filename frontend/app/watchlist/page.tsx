'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import { useMalAuth } from '@/lib/hooks/useMalAuth';
import { api, type MalAnimeItem, type Anime } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import MalAuthModal from '@/components/MalAuthModal';

type TabType = 'local' | 'watching' | 'plan_to_watch' | 'completed';

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist, clearWatchlist } = useWatchlist();
  const { isAuthenticated, user, accessToken } = useMalAuth();

  const [activeTab, setActiveTab] = useState<TabType>('local');
  const [malAnimeList, setMalAnimeList] = useState<MalAnimeItem[]>([]);
  const [malLoading, setMalLoading] = useState(false);
  const [malError, setMalError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Fetch MAL anime list based on active tab
  const fetchMalList = useCallback(async (tab: TabType) => {
    if (!accessToken || tab === 'local') return;
    setMalLoading(true);
    setMalError(null);
    try {
      const res = await api.malGetAnimeList(accessToken, tab, 100);
      if (res.success && Array.isArray(res.data)) {
        setMalAnimeList(res.data);
      } else {
        setMalError(res.error || 'Gagal memuat daftar anime dari MyAnimeList.');
      }
    } catch {
      setMalError('Gagal terhubung ke server MyAnimeList.');
    } finally {
      setMalLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (activeTab !== 'local') {
      fetchMalList(activeTab);
    }
  }, [activeTab, fetchMalList]);

  // Quick increment episode on MAL
  const handleIncrementEpisode = async (item: MalAnimeItem) => {
    if (!accessToken) return;
    setUpdatingId(item.malId);
    try {
      const nextEp = (item.numWatchedEpisodes || 0) + 1;
      const res = await api.malUpdateAnimeStatus(accessToken, {
        anime_id: item.malId,
        num_watched_episodes: nextEp,
        status: item.totalEpisodes && nextEp >= item.totalEpisodes ? 'completed' : 'watching',
      });
      if (res.success) {
        setMalAnimeList((prev) =>
          prev.map((a) => (a.malId === item.malId ? { ...a, numWatchedEpisodes: nextEp } : a))
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

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
              Simpan anime favorit dan sinkronkan progres dengan MyAnimeList
            </p>
          </div>
        </div>

        {/* MAL Auth status badge / Connect button */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 bg-[#161616] border border-[#2a2a2a] px-3.5 py-2 rounded-xl">
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#2e51a2]">
              {user.picture ? (
                <Image src={user.picture} alt={user.name} fill sizes="28px" className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-xs">
              <p className="text-white font-bold">{user.name}</p>
              <p className="text-emerald-400 text-[10px] flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                MAL Tersinkron
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-[#2e51a2] hover:bg-[#254287] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-[#2e51a2]/20"
          >
            <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center text-[10px]">M</div>
            Hubungkan MyAnimeList
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#222] pb-3 mb-6 scrollbar-none">
        <button
          onClick={() => setActiveTab('local')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'local'
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-[#161616] text-gray-400 hover:text-white hover:bg-[#202020]'
          }`}
        >
          <span>📱 Watchlist Lokal</span>
          <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px]">
            {watchlist.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('watching')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'watching'
              ? 'bg-[#2e51a2] text-white shadow-lg shadow-[#2e51a2]/25'
              : 'bg-[#161616] text-gray-400 hover:text-white hover:bg-[#202020]'
          }`}
        >
          <span>📺 Sedang Ditonton (MAL)</span>
          {activeTab === 'watching' && (
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px]">
              {malAnimeList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('plan_to_watch')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'plan_to_watch'
              ? 'bg-[#2e51a2] text-white shadow-lg shadow-[#2e51a2]/25'
              : 'bg-[#161616] text-gray-400 hover:text-white hover:bg-[#202020]'
          }`}
        >
          <span>📑 Rencana Nonton (MAL)</span>
          {activeTab === 'plan_to_watch' && (
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px]">
              {malAnimeList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'bg-[#2e51a2] text-white shadow-lg shadow-[#2e51a2]/25'
              : 'bg-[#161616] text-gray-400 hover:text-white hover:bg-[#202020]'
          }`}
        >
          <span>✅ Selesai (MAL)</span>
          {activeTab === 'completed' && (
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px]">
              {malAnimeList.length}
            </span>
          )}
        </button>
      </div>

      {/* Local Watchlist Tab */}
      {activeTab === 'local' && (
        <div>
          {watchlist.length > 0 ? (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={clearWatchlist}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Hapus Semua Watchlist Lokal
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
                        removeFromWatchlist(anime.id);
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
              <h3 className="text-white font-bold text-base mb-1">Watchlist Lokal Kosong</h3>
              <p className="text-gray-500 text-xs max-w-sm mb-6">
                Klik tombol bookmark pada halaman detail anime untuk menyimpannya ke watchlist lokal Anda.
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

      {/* MyAnimeList Cloud Tabs (watching, plan_to_watch, completed) */}
      {activeTab !== 'local' && (
        <div>
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-[#141414] border border-[#222] rounded-2xl p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#2e51a2]/20 border border-[#2e51a2]/40 flex items-center justify-center text-[#8ba7f0] font-black text-xl mb-4">
                MAL
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Hubungkan Akun MyAnimeList</h3>
              <p className="text-gray-400 text-xs max-w-md mb-6 leading-relaxed">
                Sambungkan akun MyAnimeList untuk melihat daftar anime yang sedang Anda tonton, rencana nonton, dan riwayat episode secara real-time.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="bg-[#2e51a2] hover:bg-[#254287] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-[#2e51a2]/30 flex items-center gap-2"
              >
                <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center text-[10px]">M</div>
                Hubungkan Sekarang
              </button>
            </div>
          ) : malLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-[#161616] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : malError ? (
            <div className="text-center py-16">
              <p className="text-red-400 text-sm mb-4">{malError}</p>
              <button
                onClick={() => fetchMalList(activeTab)}
                className="bg-[#222] hover:bg-[#333] text-white text-xs px-4 py-2 rounded-lg"
              >
                Coba Lagi
              </button>
            </div>
          ) : malAnimeList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {malAnimeList.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden flex flex-col group hover:border-[#2e51a2]/60 transition-all"
                >
                  <Link
                    href={`/search?q=${encodeURIComponent(item.title)}`}
                    className="relative aspect-[2/3] w-full block overflow-hidden bg-black"
                  >
                    {item.poster && (
                      <Image
                        src={item.poster}
                        alt={item.title}
                        fill
                        sizes="180px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white">
                      MAL #{item.malId}
                    </div>
                    {item.score > 0 && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black flex items-center gap-1">
                        ★ {item.score}
                      </div>
                    )}
                  </Link>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/search?q=${encodeURIComponent(item.title)}`}
                        className="text-white text-xs font-bold line-clamp-2 hover:text-[#8ba7f0] transition-colors"
                      >
                        {item.title}
                      </Link>

                      {/* Episode Counter */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                        <span>Progress:</span>
                        <span className="font-semibold text-gray-200">
                          {item.numWatchedEpisodes} / {item.totalEpisodes || '?'} Ep
                        </span>
                      </div>
                    </div>

                    {/* Quick increment button for 'watching' tab */}
                    {activeTab === 'watching' && (
                      <button
                        onClick={() => handleIncrementEpisode(item)}
                        disabled={updatingId === item.malId}
                        className="mt-3 w-full py-1.5 bg-[#2e51a2]/20 hover:bg-[#2e51a2] text-[#8ba7f0] hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-[#2e51a2]/40 hover:border-transparent flex items-center justify-center gap-1"
                      >
                        {updatingId === item.malId ? '...' : '+1 Episode'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gray-500 text-xs mb-4">Tidak ada anime pada kategori ini di akun MyAnimeList Anda.</p>
              <Link href="/" className="bg-primary text-white text-xs px-5 py-2.5 rounded-xl font-medium">
                Cari Anime Sekarang
              </Link>
            </div>
          )}
        </div>
      )}

      {/* MAL Auth Modal */}
      <MalAuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
