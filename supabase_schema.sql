-- =============================================================================
-- AniStream – Supabase Schema
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel watchlist
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watchlist (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id    TEXT NOT NULL,
  anime_data  JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, anime_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON public.watchlist(user_id);

-- Row Level Security: users can only see/edit their own data
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON public.watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own watchlist"
  ON public.watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own watchlist"
  ON public.watchlist FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own watchlist"
  ON public.watchlist FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel continue_watching
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.continue_watching (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_slug  TEXT NOT NULL,
  item_data     JSONB NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, episode_slug)
);

-- Index for fast user lookups ordered by recency
CREATE INDEX IF NOT EXISTS cw_user_id_updated_idx
  ON public.continue_watching(user_id, updated_at DESC);

-- Row Level Security
ALTER TABLE public.continue_watching ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own continue_watching"
  ON public.continue_watching FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own continue_watching"
  ON public.continue_watching FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own continue_watching"
  ON public.continue_watching FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own continue_watching"
  ON public.continue_watching FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- Done! Sekarang pergi ke Authentication → Email Templates dan aktifkan
-- "Magic Link" sebagai metode login.
-- =============================================================================
