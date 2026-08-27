'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSupabaseAuth } from '@/lib/hooks/useSupabaseAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithOAuth, isConfigured } = useSupabaseAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Harap isi email dan password.');
      setLoading(false);
      return;
    }

    if (isRegister) {
      const res = await signUpWithEmail(email.trim(), password, fullName.trim());
      if (res.success) {
        setMessage('Akun berhasil dibuat! Silakan cek email Anda untuk konfirmasi atau langsung login.');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(res.error || 'Gagal mendaftar.');
      }
    } else {
      const res = await signInWithEmail(email.trim(), password);
      if (res.success) {
        setMessage('Berhasil masuk! Menyinkronkan data...');
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError(res.error || 'Email atau password salah.');
      }
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null);
    const res = await signInWithOAuth(provider);
    if (!res.success) {
      setError(res.error || 'Gagal masuk via OAuth.');
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md my-auto bg-[#121212] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#222] bg-[#161616] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-black text-white text-sm">
              A
            </div>
            <div>
              <h3 className="text-white font-bold text-base">
                {isRegister ? 'Daftar Akun AniStream' : 'Masuk ke AniStream'}
              </h3>
              <p className="text-gray-400 text-xs">Simpan watchlist & riwayat nonton di cloud</p>
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

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {!isConfigured && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 text-xs text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1">
                ⚠️ Supabase Keys Belum Diatur
              </p>
              <p className="text-amber-300/80 text-[11px] leading-relaxed">
                Tambahkan <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di pengaturan environment hosting Anda untuk mengaktifkan cloud login.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 text-xs bg-red-950/50 border border-red-800/60 text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 text-xs bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Nama Lengkap / Username
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-[#181818] border border-[#333] focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-[#181818] border border-[#333] focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-[#181818] border border-[#333] focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-primary/25"
            >
              {loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#222]" />
            <span className="flex-shrink mx-3 text-gray-600 text-[11px]">atau</span>
            <div className="flex-grow border-t border-[#222]" />
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="w-full py-2.5 px-4 bg-[#181818] hover:bg-[#222] border border-[#333] text-gray-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.3.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              Lanjutkan dengan Google
            </button>
          </div>

          {/* Toggle Register / Login */}
          <div className="pt-2 text-center text-xs text-gray-400">
            {isRegister ? (
              <p>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(null); setMessage(null); }}
                  className="text-primary-light font-bold hover:underline"
                >
                  Masuk di sini
                </button>
              </p>
            ) : (
              <p>
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(null); setMessage(null); }}
                  className="text-primary-light font-bold hover:underline"
                >
                  Daftar gratis
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
