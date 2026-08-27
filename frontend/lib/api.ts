const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Anime {
  id: string;
  title: string;
  slug: string;
  poster: string;
  type: string;
  status: string;
  episodes?: number;
  rating?: string;
  synopsis?: string;
  genres?: string[];
  studio?: string;
  year?: number;
}

export interface Episode {
  slug: string;
  title: string;
  episode_number: string;
}

export interface Stream {
  quality: string;
  url: string;
}

export interface Server {
  server: string;
  streams: Stream[];
}

export interface EpisodeDetail {
  title: string;
  anime: string;
  animeSlug: string;
  servers: Server[];
  prev_episode?: string;
  next_episode?: string;
}

export interface AnimeDetail extends Anime {
  backdrop?: string;
  alt_title?: string;
  episodes_list?: Episode[];
  source?: string;
}

export interface GenreItem {
  name: string;
  slug: string;
}

export interface ScheduleAnime {
  title: string;
  slug: string;
  episode: string;
  time: string;
  poster: string;
}

export interface DaySchedule {
  day: string;
  animes: ScheduleAnime[];
}

export interface ApiResponse<T> {
  success: boolean;
  source: string;
  data: T;
}

// Fast in-memory client-side cache (5-minute TTL)
const clientCache = new Map<string, { data: any; exp: number }>();

async function fetchApi<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const now = Date.now();
  const cached = clientCache.get(url);
  if (cached && cached.exp > now) {
    return cached.data;
  }

  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API error: ${res.status} - ${url}`);
  const json = await res.json();

  if (json && json.success) {
    // Cache for 5 minutes in browser memory
    clientCache.set(url, { data: json, exp: now + 5 * 60 * 1000 });
  }

  return json;
}

export interface MalUser {
  id: number;
  name: string;
  picture?: string;
  location?: string;
  joined_at?: string;
}

export interface MalAnimeItem {
  id: string;
  malId: number;
  title: string;
  poster: string;
  type: string;
  totalEpisodes?: number | null;
  status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch' | string;
  score: number;
  numWatchedEpisodes: number;
  updatedAt?: string;
}

export const api = {
  getOngoing: () => fetchApi<Anime[]>(`${API_BASE}/api/anime/ongoing`),
  getComplete: () => fetchApi<Anime[]>(`${API_BASE}/api/anime/complete`),
  getPopular: () => fetchApi<Anime[]>(`${API_BASE}/api/anime/popular`),
  searchAnime: (q: string) =>
    fetchApi<Anime[]>(`${API_BASE}/api/anime/search?q=${encodeURIComponent(q)}`),
  getAnimeDetail: (slug: string) =>
    fetchApi<AnimeDetail>(`${API_BASE}/api/anime/${slug}`),
  getEpisode: (slug: string) =>
    fetchApi<EpisodeDetail>(`${API_BASE}/api/episode/${slug}`),
  getSchedule: () => fetchApi<DaySchedule[]>(`${API_BASE}/api/schedule`),
  getGenres: () => fetchApi<GenreItem[]>(`${API_BASE}/api/genres`),
  getGenreAnime: (slug: string, page = 1) =>
    fetchApi<Anime[]>(`${API_BASE}/api/genre/${slug}?page=${page}`),

  // MyAnimeList API endpoints
  malExchangeToken: (data: { code?: string; code_verifier?: string; refresh_token?: string; client_id?: string }) =>
    fetch(`${API_BASE}/api/mal/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((res) => res.json()),

  malGetUser: (accessToken: string) =>
    fetch(`${API_BASE}/api/mal/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((res) => res.json()),

  malGetAnimeList: (accessToken: string, status?: string, limit = 50) =>
    fetch(`${API_BASE}/api/mal/animelist?status=${status || ''}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((res) => res.json()),

  malUpdateAnimeStatus: (
    accessToken: string,
    payload: { anime_id?: number | string; title?: string; status?: string; num_watched_episodes?: number; score?: number }
  ) =>
    fetch(`${API_BASE}/api/mal/update-status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json()),
};
