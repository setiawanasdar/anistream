'use strict';

const NodeCache = require('node-cache');

// ---------------------------------------------------------------------------
// TTL configuration (seconds) – overridable via environment variables
// ---------------------------------------------------------------------------
const TTL = {
  ongoing:  parseInt(process.env.CACHE_TTL_ONGOING,  10) || 1800,  // 30 min (was 5 min)
  complete: parseInt(process.env.CACHE_TTL_COMPLETE, 10) || 7200,  // 2 hr  (was 10 min)
  detail:   parseInt(process.env.CACHE_TTL_DETAIL,   10) || 7200,  // 2 hr  (was 30 min)
  episode:  parseInt(process.env.CACHE_TTL_EPISODE,  10) || 600,   // 10 min
  schedule: parseInt(process.env.CACHE_TTL_SCHEDULE, 10) || 3600,  // 60 min
  genres:   parseInt(process.env.CACHE_TTL_GENRES,   10) || 86400, // 24 hr
  popular:  parseInt(process.env.CACHE_TTL_POPULAR,  10) || 1800,  // 30 min (was 10 min)
  search:   parseInt(process.env.CACHE_TTL_SEARCH,   10) || 120,   // 2 min
  genre:    parseInt(process.env.CACHE_TTL_GENRE,    10) || 1800,  // 30 min (was 5 min)
};

// Single shared cache instance (stdTTL=0 means we supply TTL per key)
const cache = new NodeCache({ stdTTL: 0, checkperiod: 120, useClones: false });

/**
 * Resolve a TTL (seconds) from the current request path.
 * The first path segment after /api/ is used as the category key.
 * @param {string} path - e.g. '/api/anime/ongoing'
 */
function resolveTTL(path) {
  // Normalise: remove leading slash, split
  const parts = path.replace(/^\/+/, '').split('/');
  // parts[0] = 'api', parts[1] = 'anime'|'episode'|'schedule'|'genres'|'genre'
  // parts[2] might be 'ongoing'|'complete'|'popular'|'search'|slug
  const segment2 = parts[1] || '';
  const segment3 = parts[2] || '';

  if (segment2 === 'schedule') return TTL.schedule;
  if (segment2 === 'genres')   return TTL.genres;
  if (segment2 === 'genre')    return TTL.genre;
  if (segment2 === 'episode')  return TTL.episode;
  if (segment3 === 'ongoing')  return TTL.ongoing;
  if (segment3 === 'complete') return TTL.complete;
  if (segment3 === 'popular')  return TTL.popular;
  if (segment3 === 'search')   return TTL.search;
  // Default for anime detail pages
  return TTL.detail;
}

/**
 * Express middleware that caches successful JSON responses.
 * Cache key = request path + serialised query string.
 */
function cacheMiddleware(req, res, next) {
  const key = req.path + (Object.keys(req.query).length ? ':' + JSON.stringify(req.query) : '');
  const cached = cache.get(key);

  if (cached !== undefined) {
    return res.json({ ...cached, cached: true });
  }

  // Intercept res.json to store the response before sending
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses
    if (body && body.success === true) {
      const ttl = resolveTTL(req.path);
      cache.set(key, body, ttl);
    }
    return originalJson(body);
  };

  next();
}

/**
 * Manually invalidate a cache entry.
 * @param {string} key
 */
function invalidate(key) {
  cache.del(key);
}

/**
 * Return cache statistics.
 */
function stats() {
  return cache.getStats();
}

module.exports = { cacheMiddleware, invalidate, stats, TTL };
