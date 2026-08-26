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
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Missing query parameter: q',
    });
  }

  try {
    // Strategy: Run AniList (fast, reliable, always returns series not episodes)
    // and Otakudesu in parallel. Prefer Otakudesu if it responds in time (has
    // Sub Indo metadata), otherwise use AniList results.

    const otakudesu = require('../scrapers/otakudesu');

    // Short timeout for Otakudesu search to prevent blocking the response
    const otakudesuPromise = Promise.race([
      otakudesu.searchAnime(q),
      new Promise(resolve => setTimeout(() => resolve([]), 6000)), // 6s timeout
    ]);

    const anilistPromise = anilist.searchAnime(q, 1, 20);

    const [otakuResults, anilistResults] = await Promise.all([
      otakudesuPromise.catch(() => []),
      anilistPromise.catch(() => []),
    ]);

    // Filter Otakudesu results: ONLY keep series (not per-episode entries)
    // Episode entries have titles like "Anime Name Episode 1" or slugs with "episode"
    const validOtakuResults = otakuResults.filter(item => {
      if (!item.title || !item.slug) return false;
      // Skip items that are per-episode entries
      const titleLower = item.title.toLowerCase();
      const slugLower = item.slug.toLowerCase();
      if (titleLower.includes('episode') && /episode\s*\d+/i.test(titleLower)) return false;
      if (slugLower.includes('episode-') && /episode-\d+/i.test(slugLower)) return false;
      return true;
    });

    // If Otakudesu returned valid series results, use those (they have Sub Indo context)
    if (validOtakuResults.length > 0) {
      return res.json({ success: true, source: 'otakudesu', query: q, data: validOtakuResults });
    }

    // Otherwise fall back to AniList results (always proper series, never episodes)
    return res.json({ success: true, source: 'anilist', query: q, data: anilistResults || [] });

  } catch (err) {
    console.error('[routes/anime] /search error:', err.message);
    // Final fallback: AniList only
    try {
      const anilistData = await anilist.searchAnime(q);
      res.json({ success: true, source: 'anilist', query: q, data: anilistData || [] });
    } catch {
      res.json({ success: true, source: 'anilist', query: q, data: [] });
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
    // First try all scrapers (Otakudesu, etc.)
    try {
      const { data, source } = await withFallback(fallbackOrder, 'getAnimeDetail', slug);
      if (data) {
        return res.json({ success: true, source, data });
      }
    } catch {
      // Scraper failed, fall through to AniList
    }

    // AniList fallback: resolve slug to AniList detail
    // slug could be: "steins-gate" (romaji slug from AniList search results)
    //                or an AniList numeric ID
    try {
      let anilistData = null;

      // Try numeric ID first
      if (/^\d+$/.test(slug)) {
        anilistData = await anilist.getById(parseInt(slug));
      }

      // Try search by slug (convert slug back to search query)
      if (!anilistData) {
        const searchQuery = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const results = await anilist.searchAnime(searchQuery, 1, 5);
        if (results.length > 0) {
          anilistData = results[0];
        }
      }

      if (anilistData) {
        // Build episode list from AniList episode count
        const epCount = parseInt(anilistData.episodes || '0', 10);
        const episodes = [];
        if (epCount > 0) {
          for (let i = 1; i <= epCount; i++) {
            const epSlug = `${anilistData.slug}-episode-${i}-sub-indo`;
            episodes.push({
              id: epSlug,
              title: `Episode ${i}`,
              slug: epSlug,
              episode: String(i),
            });
          }
        }

        return res.json({
          success: true,
          source: 'anilist',
          data: {
            ...anilistData,
            episodes_list: episodes,
            total_episodes: anilistData.episodes || null,
          },
        });
      }
    } catch (aniErr) {
      console.error('[routes/anime] AniList detail fallback error:', aniErr.message);
    }

    return res.status(404).json({ success: false, error: 'Anime not found' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
