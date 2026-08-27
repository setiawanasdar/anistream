-- ==============================================================================
-- AniStream Supabase Database Schema
-- Jalankan query ini di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Tabel Watchlist (Menyimpan daftar anime yang disimpan pengguna)
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    anime_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    poster TEXT,
    type TEXT DEFAULT 'TV',
    status TEXT,
    episodes TEXT,
    rating TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

-- 2. Tabel Watch History (Menyimpan riwayat episode yang ditonton pengguna)
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    episode_slug TEXT NOT NULL,
    anime_slug TEXT NOT NULL,
    anime_title TEXT NOT NULL,
    episode_title TEXT NOT NULL,
    poster TEXT,
    progress INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, episode_slug)
);

-- 3. Row Level Security (RLS) - Keamanan Data Pengguna
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Policy Watchlist: Pengguna hanya dapat membaca dan mengubah data miliknya sendiri
CREATE POLICY "Users can manage own watchlist"
ON public.watchlist
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy Watch History: Pengguna hanya dapat membaca dan mengubah riwayat miliknya sendiri
CREATE POLICY "Users can manage own watch history"
ON public.watch_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
