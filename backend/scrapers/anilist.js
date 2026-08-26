'use strict';

/**
 * AniList GraphQL API Client
 * Endpoint: https://graphql.anilist.co
 *
 * Used as a metadata fallback when all scrapers fail.
 * Returns data in the same standardised shape as the other scrapers.
 *
 * AniList API is free and requires no API key.
 * Rate limit: 90 requests per minute (per IP).
 */

const axios = require('axios');

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

// ---------------------------------------------------------------------------
// GraphQL query fragments
// ---------------------------------------------------------------------------

// Reusable media fields
const MEDIA_FIELDS = `
  id
  title {
    romaji
    english
    native
  }
  coverImage {
    large
    medium
  }
  bannerImage
  description(asHtml: false)
  genres
  status
  episodes
  averageScore
  popularity
  studios(isMain: true) {
    nodes { name }
  }
  startDate { year month day }
  endDate   { year month day }
  format
  season
  seasonYear
  tags { name }
  siteUrl
`;

// ---------------------------------------------------------------------------
// Helper: execute a GraphQL query
// ---------------------------------------------------------------------------

async function gqlQuery(query, variables = {}) {
  const response = await axios.post(
    ANILIST_ENDPOINT,
    { query, variables },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    }
  );
  if (response.data.errors) {
    const msg = response.data.errors.map((e) => e.message).join(', ');
    throw new Error(`AniList API error: ${msg}`);
  }
  return response.data.data;
}

// ---------------------------------------------------------------------------
// Normalise: convert AniList media object to standard scraper shape
// ---------------------------------------------------------------------------

function normalise(media) {
  const title = media.title.english
    || media.title.romaji
    || media.title.native
    || 'Unknown';

  // Build a URL-safe slug from the English/romaji title
  const slug = (media.title.romaji || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const studio = media.studios && media.studios.nodes && media.studios.nodes.length
    ? media.studios.nodes[0].name
    : null;

  const year = media.startDate ? String(media.startDate.year || '') : null;

  // Map AniList status to human-readable
  const statusMap = {
    FINISHED:          'Completed',
    RELEASING:         'Ongoing',
    NOT_YET_RELEASED:  'Upcoming',
    CANCELLED:         'Cancelled',
    HIATUS:            'Hiatus',
  };

  const typeMap = {
    TV:       'TV',
    TV_SHORT: 'TV Short',
    MOVIE:    'Movie',
    SPECIAL:  'Special',
    OVA:      'OVA',
    ONA:      'ONA',
    MUSIC:    'Music',
  };

  return {
    id: String(media.id),
    title,
    slug,
    poster: media.coverImage ? (media.coverImage.large || media.coverImage.medium || '') : '',
    banner: media.bannerImage || null,
    type:   typeMap[media.format] || media.format || null,
    status: statusMap[media.status] || media.status || null,
    episodes: media.episodes ? String(media.episodes) : null,
    rating:   media.averageScore ? String(media.averageScore / 10) : null,
    genres:   media.genres || [],
    synopsis: media.description || null,
    studio,
    year,
    // AniList-specific extras (helpful for metadata enrichment)
    anilistId:  media.id,
    siteUrl:    media.siteUrl || null,
    popularity: media.popularity || null,
  };
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Search anime by keyword.
 * @param {string} query
 * @param {number} [page=1]
 * @param {number} [perPage=20]
 */
async function searchAnime(query, page = 1, perPage = 20) {
  try {
    const gql = `
      query ($query: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(search: $query, type: ANIME, sort: SEARCH_MATCH) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await gqlQuery(gql, { query, page, perPage });
    return data.Page.media.map(normalise);
  } catch (err) {
    console.error('[anilist] searchAnime error:', err.message);
    return [];
  }
}

/**
 * Get trending anime (updated recently, high popularity).
 * @param {number} [page=1]
 * @param {number} [perPage=20]
 */
async function getTrending(page = 1, perPage = 20) {
  try {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(sort: TRENDING_DESC, type: ANIME, status: RELEASING) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await gqlQuery(gql, { page, perPage });
    return data.Page.media.map(normalise);
  } catch (err) {
    console.error('[anilist] getTrending error:', err.message);
    return [];
  }
}

/**
 * Get all-time popular anime.
 * @param {number} [page=1]
 * @param {number} [perPage=20]
 */
async function getPopular(page = 1, perPage = 20) {
  try {
    const gql = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(sort: POPULARITY_DESC, type: ANIME) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await gqlQuery(gql, { page, perPage });
    return data.Page.media.map(normalise);
  } catch (err) {
    console.error('[anilist] getPopular error:', err.message);
    return [];
  }
}

/**
 * Get anime by AniList ID.
 * Useful for enriching scraper results with AniList metadata.
 * @param {number} id
 */
async function getById(id) {
  try {
    const gql = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${MEDIA_FIELDS}
        }
      }
    `;
    const data = await gqlQuery(gql, { id: Number(id) });
    return normalise(data.Media);
  } catch (err) {
    console.error('[anilist] getById error:', err.message);
    return null;
  }
}

/**
 * Get anime airing this season.
 */
async function getCurrentSeason(page = 1, perPage = 20) {
  try {
    // Determine current season
    const now    = new Date();
    const month  = now.getMonth() + 1; // 1-12
    const year   = now.getFullYear();
    const season =
      month <= 3  ? 'WINTER' :
      month <= 6  ? 'SPRING' :
      month <= 9  ? 'SUMMER' : 'FALL';

    const gql = `
      query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
            ${MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await gqlQuery(gql, { season, year, page, perPage });
    return data.Page.media.map(normalise);
  } catch (err) {
    console.error('[anilist] getCurrentSeason error:', err.message);
    return [];
  }
}

/**
 * Get alternate / Romaji / English titles and synonyms for a search query.
 * Useful for bridging English names (e.g. "Demon Slayer") to Japanese/Romaji (e.g. "Kimetsu no Yaiba").
 * @param {string} query
 */
async function getAlternateTitles(query) {
  try {
    const gql = `
      query ($search: String) {
        Page(page: 1, perPage: 4) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            title {
              romaji
              english
              native
            }
            synonyms
          }
        }
      }
    `;
    const data = await gqlQuery(gql, { search: query });
    const titles = new Set();
    const mediaList = data?.Page?.media || [];
    mediaList.forEach((m) => {
      if (m.title?.romaji) titles.add(m.title.romaji);
      if (m.title?.english) titles.add(m.title.english);
      if (Array.isArray(m.synonyms)) {
        m.synonyms.forEach((s) => {
          // Add clean short title (exclude extra notes)
          const clean = s.split(/[:\-(]/)[0].trim();
          if (clean && clean.length > 2) titles.add(clean);
          titles.add(s);
        });
      }
    });
    return Array.from(titles);
  } catch {
    return [];
  }
}

async function getOngoing() {
  return getTrending();
}

module.exports = {
  searchAnime,
  getTrending,
  getPopular,
  getById,
  getCurrentSeason,
  getOngoing,
  getAlternateTitles,
};
