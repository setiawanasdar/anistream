'use strict';

/**
 * Schedule & Genre routes
 * Mounted at: /api
 *
 * GET /api/schedule          - Weekly airing schedule
 * GET /api/genres            - All genre list
 * GET /api/genre/:slug?page= - Anime in genre
 */

const express  = require('express');
const router   = express.Router();
const { withFallback }    = require('../utils/fallback');
const { cacheMiddleware } = require('../middleware/cache');
const { fallbackOrder }   = require('../config/sources');

router.use(cacheMiddleware);

// ---------------------------------------------------------------------------
// GET /api/schedule
// ---------------------------------------------------------------------------
router.get('/schedule', async (req, res, next) => {
  try {
    const { data, source } = await withFallback(fallbackOrder, 'getSchedule');
    res.json({ success: true, source, data });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/genres
// ---------------------------------------------------------------------------
router.get('/genres', async (req, res, next) => {
  try {
    const { data, source } = await withFallback(fallbackOrder, 'getGenres');
    res.json({ success: true, source, data });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/genre/:slug?page=<number>
// ---------------------------------------------------------------------------
router.get('/genre/:slug', async (req, res, next) => {
  const { slug } = req.params;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  try {
    const { data, source } = await withFallback(fallbackOrder, 'getGenreAnime', slug, page);
    res.json({ success: true, source, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
