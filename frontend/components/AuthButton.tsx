'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * AuthButton component
 * - Shows login/logout button in the navbar
 * - Uses magic link (OTP email) – no password needed
 * - Hidden if Supabase is not configured
 */
export default function AuthButton() {
  const { user, loading, signIn, signOut, isSupabaseEnabled } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Don't render if Supabase is not configured
  if (!isSupabaseEnabled) return null;
  if (loading) return null;

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await signIn(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim link login');
    } finally {
      setSubmitting(false);
    }
  }, [email, signIn]);

  const handleClose = () => {
    setShowModal(false);
    setSent(false);
    setEmail('');
    setError('');
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[120px]">
          {user.email}
        </span>
        <button
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-[#333] hover:border-[#555] transition-colors"
          title="Logout"
        >
          Keluar
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#333] hover:border-primary transition-colors"
        title="Login untuk sync watchlist & riwayat antar device"
      >
        {/* Cloud sync icon */}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
        <span className="hidden sm:inline">Sync</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div
            className="bg-[#111] border border-[#222] rounded-xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white font-semibold text-lg mb-1">Login untuk Sync</h2>
            <p className="text-gray-400 text-sm mb-4">
              Sync watchlist & riwayat nonton antar perangkat. Kami kirim magic link ke emailmu.
            </p>

            {sent ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">📧</div>
                <p className="text-white font-medium mb-1">Cek emailmu!</p>
                <p className="text-gray-400 text-sm">
                  Link login dikirim ke <span className="text-primary">{email}</span>.
                  Klik link tersebut untuk masuk.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-4 text-sm text-gray-400 hover:text-white"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignIn}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@kamu.com"
                  required
                  autoFocus
                  className="w-full bg-[#1a1a1a] border border-[#333] text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary mb-3"
                />
                {error && (
                  <p className="text-red-400 text-xs mb-3">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Magic Link'}
                </button>
                <p className="text-gray-500 text-xs mt-3 text-center">
                  Tanpa password. Tanpa data pribadi selain email.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
