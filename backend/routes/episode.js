'use strict';

/**
 * Episode routes
 * Mounted at: /api/episode
 *
 * GET /api/episode/:slug  - Episode streaming data and download links
 */

const express  = require('express');
const router   = express.Router();
const { withFallback }    = require('../utils/fallback');
const { cacheMiddleware } = require('../middleware/cache');
const { fallbackOrder }   = require('../config/sources');

router.use(cacheMiddleware);

// ---------------------------------------------------------------------------
// GET /api/episode/:slug
// ---------------------------------------------------------------------------
router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;

  try {
    const { data, source } = await withFallback(fallbackOrder, 'getEpisode', slug);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    res.json({ success: true, source, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
