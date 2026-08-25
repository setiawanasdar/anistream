'use strict';

/**
 * Anime routes
 * Mounted at: /api/anime
 *
 * GET /api/anime/ongoing       - Currently airing anime
 * GET /api/anime/complete      - Completed anime
 * GET /api/anime/popular       - Popular anime
 * GET /api/anime/search?q=...  - Search by keyword
 * GET /api/anime/:slug         - Full anime detail
 * GET /api/genres              - All genres
 * GET /api/genre/:slug?page=N  - Anime in a genre
 */

const express  = require('express');
const router   = express.Router();
const { withFallback }    = require('../utils/fallback');
const { cacheMiddleware } = require('../middleware/cache');
const { fallbackOrder }   = require('../config/sources');
const anilist             = require('../scrapers/anilist');

// Apply cache to all routes in this router
router.use(cacheMiddleware);

// ---------------------------------------------------------------------------
// GET /api/anime/ongoing
// ---------------------------------------------------------------------------
router.get('/ongoing', async (req, res, next) => {
  try {
    const { data, source } = await withFallback(fallbackOrder, 'getOngoing');
    res.json({ success: true, source, data });
  } catch (err) {
    // Final AniList fallback for popular trending
    try {
      const data = await anilist.getTrending();
      res.json({ success: true, source: 'anilist', data });
    } catch {
      next(err);
    }
  }
});

// ---------------------------------------------------------------------------
// GET /api/anime/complete
// ---------------------------------------------------------------------------
router.get('/complete', async (req, res, next) => {
  try {
    const { data, source } = await withFallback(fallbackOrder, 'getComplete');
    res.json({ success: true, source, data });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/anime/popular
// ---------------------------------------------------------------------------
router.get('/popular', async (req, res, next) => {
  try {
    const { data, source } = await withFallback(fallbackOrder, 'getPopular');
    res.json({ success: true, source, data });
  } catch {
    // AniList fallback for popular
    try {
      const data = await anilist.getPopular();
      res.json({ success: true, source: 'anilist', data });
    } catch (err) {
      next(err);
    }
  }
});

// ---------------------------------------------------------------------------
// GET /api/anime/search?q=<keyword>
// ---------------------------------------------------------------------------
router.get('/search', async (req, res, next) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Missing query parameter: q',
    });
  }

  try {
    const { data, source } = await withFallback(fallbackOrder, 'searchAnime', q);
    res.json({ success: true, source, query: q, data });
  } catch {
    // AniList fallback for search
    try {
      const data = await anilist.searchAnime(q);
      res.json({ success: true, source: 'anilist', query: q, data });
    } catch (err) {
      next(err);
    }
  }
});

// ---------------------------------------------------------------------------
// GET /api/anime/:slug
// Must be LAST to avoid matching 'ongoing', 'complete', 'popular', 'search'
// ---------------------------------------------------------------------------
router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;

  try {
    const { data, source } = await withFallback(fallbackOrder, 'getAnimeDetail', slug);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Anime not found' });
    }
    res.json({ success: true, source, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
