'use client';

import { useState } from 'react';
import { useMalAuth } from '@/lib/hooks/useMalAuth';

interface MalAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generate secure random string for PKCE code_verifier
function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  for (let i = 0; i < 64; i++) {
    verifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return verifier;
}

export default function MalAuthModal({ isOpen, onClose }: MalAuthModalProps) {
  const { loginWithToken, loginWithCode, loading } = useMalAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [codeVerifierInput, setCodeVerifierInput] = useState('');
  const [authCodeInput, setAuthCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'oauth' | 'token'>('oauth');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID || '6114d00ca681b77c0115652520400e21';

  const handleStartOAuth = () => {
    setError(null);
    const verifier = generateCodeVerifier();
    sessionStorage.setItem('mal_code_verifier', verifier);
    setCodeVerifierInput(verifier);

    // MyAnimeList OAuth PKCE Authorization URL (open in full new tab to avoid popup cookie loops)
    const authUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${clientId}&code_challenge=${verifier}&code_challenge_method=plain`;
    window.open(authUrl, '_blank');
  };

  const handleExchangeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const verifier = codeVerifierInput || sessionStorage.getItem('mal_code_verifier') || '';
    let rawCode = authCodeInput.trim();

    // Auto-extract code if user pastes the entire redirect URL (e.g. https://...?code=ABC123)
    if (rawCode.includes('code=')) {
      const match = rawCode.match(/[?&]code=([^&]+)/);
      if (match && match[1]) {
        rawCode = decodeURIComponent(match[1]);
      }
    }

    if (!rawCode) {
      setError('Masukkan Authorization Code yang didapat dari halaman MyAnimeList.');
      return;
    }
    if (!verifier) {
      setError('Code verifier tidak ditemukan. Silakan klik "Buka Halaman Otorisasi MAL" terlebih dahulu.');
      return;
    }

    const res = await loginWithCode(rawCode, verifier, clientId);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    } else {
      setError(res.error || 'Autentikasi gagal. Pastikan kode benar dan belum kadaluwarsa.');
    }
  };

  const handleDirectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tokenInput.trim()) {
      setError('Masukkan Access Token MyAnimeList Anda.');
      return;
    }

    const res = await loginWithToken(tokenInput.trim());
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    } else {
      setError(res.error || 'Token tidak valid.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#121212] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2e51a2] flex items-center justify-center font-bold text-white text-xs">
              MAL
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Hubungkan MyAnimeList</h3>
              <p className="text-gray-400 text-xs">Sinkronkan riwayat tontonan & watchlist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#222] bg-[#141414]">
          <button
            onClick={() => { setActiveTab('oauth'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'oauth'
                ? 'border-[#2e51a2] text-white bg-[#1e2738]/40'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            OAuth2 Otomatis (Rekomendasi)
          </button>
          <button
            onClick={() => { setActiveTab('token'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'token'
                ? 'border-[#2e51a2] text-white bg-[#1e2738]/40'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Input Token Manual
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-950/50 border border-red-800/60 text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 text-xs bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Berhasil terhubung ke akun MyAnimeList! Memuat data...
            </div>
          )}

          {activeTab === 'oauth' ? (
            <div className="space-y-4">
              {/* Tip to avoid looping */}
              <div className="bg-[#181818] p-3.5 rounded-xl border border-[#262626] text-xs text-gray-300 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Tips agar tidak looping/ngulang di halaman login MAL:</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Pastikan browser Anda sudah dalam keadaan <strong>Login di situs MyAnimeList</strong> terlebih dahulu agar halaman otorisasi langsung memunculkan tombol <strong>Allow</strong> tanpa perlu ketik username/password lagi.
                </p>
                <div className="pt-1">
                  <a
                    href="https://myanimelist.net/login.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#8ba7f0] hover:underline font-semibold"
                  >
                    Buka situs MyAnimeList di tab baru untuk Login ↗
                  </a>
                </div>
              </div>

              {/* Step 1 Button */}
              <button
                type="button"
                onClick={handleStartOAuth}
                className="w-full py-2.5 px-4 bg-[#2e51a2] hover:bg-[#254287] text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#2e51a2]/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                1. Buka Halaman Otorisasi & Klik &quot;Allow&quot;
              </button>

              <form onSubmit={handleExchangeCode} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    2. Salin seluruh link URL browser atau kodenya, lalu tempel di sini:
                  </label>
                  <input
                    type="text"
                    value={authCodeInput}
                    onChange={(e) => setAuthCodeInput(e.target.value)}
                    placeholder="Contoh: https://localhost/?code=... atau kodenya saja"
                    className="w-full bg-[#181818] border border-[#333] focus:border-[#2e51a2] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !authCodeInput.trim()}
                  className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Menghubungkan...' : '3. Selesaikan Koneksi'}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleDirectToken} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Access Token MyAnimeList (Personal / Bearer Token)
                </label>
                <textarea
                  rows={3}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Tempel access_token MAL Anda di sini..."
                  className="w-full bg-[#181818] border border-[#333] focus:border-[#2e51a2] rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !tokenInput.trim()}
                className="w-full py-2.5 bg-[#2e51a2] hover:bg-[#254287] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {loading ? 'Memverifikasi...' : 'Simpan & Hubungkan'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
