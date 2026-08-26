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
function resolveTTL(path = '') {
  if (path.includes('/schedule')) return TTL.schedule;
  if (path.includes('/genres'))   return TTL.genres;
  if (path.includes('/genre/'))   return TTL.genre;
  if (path.includes('/episode/')) return TTL.episode;
  if (path.includes('/ongoing'))  return TTL.ongoing;
  if (path.includes('/complete')) return TTL.complete;
  if (path.includes('/popular'))  return TTL.popular;
  if (path.includes('/search'))   return TTL.search;
  return TTL.detail;
}

/**
 * Express middleware that caches successful JSON responses.
 * Cache key = full original request URL (e.g. /api/anime/naruto, /api/episode/...).
 */
function cacheMiddleware(req, res, next) {
  const key = req.originalUrl || req.url || req.path;
  const cached = cache.get(key);

  if (cached !== undefined) {
    res.setHeader('X-Cache', 'HIT');
    return res.json({ ...cached, cached: true });
  }

  res.setHeader('X-Cache', 'MISS');
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && body.success === true) {
      const ttl = resolveTTL(key);
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
