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

async function fetchApi<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    next: { revalidate: 60 },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status} - ${url}`);
  return res.json();
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
};
