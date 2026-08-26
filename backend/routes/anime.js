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
    return res.status(400).json({ success: false, error: 'Missing query parameter: q' });
  }

  try {
    const otakudesu = require('../scrapers/otakudesu');

    // Run both in parallel — AniList is primary (fast, complete, series-only)
    // Otakudesu gets 8s to respond, used to enrich/replace matching results
    const [anilistResults, otakuResults] = await Promise.all([
      anilist.searchAnime(q, 1, 50).catch(() => []),
      Promise.race([
        otakudesu.searchAnime(q),
        new Promise(resolve => setTimeout(() => resolve([]), 8000)),
      ]).catch(() => []),
    ]);

    // Filter Otakudesu: skip per-episode entries (title/slug contains "episode N")
    const validOtakuResults = (otakuResults || []).filter(item => {
      if (!item.title || !item.slug) return false;
      if (/episode\s*\d+/i.test(item.title)) return false;
      if (/episode-\d+/i.test(item.slug)) return false;
      return true;
    });

    // Merge: use AniList as base (large result set), overlay with Otakudesu data where slug matches
    // This gives us: AniList's broad coverage + Otakudesu's Sub Indo posters & ratings
    let finalResults;
    if (validOtakuResults.length > 0 && anilistResults.length === 0) {
      // Only Otakudesu responded
      finalResults = validOtakuResults;
    } else if (validOtakuResults.length > 0 && anilistResults.length > 0) {
      // Both responded: Otakudesu results first (exact Sub Indo matches), then AniList extras
      const otakuSlugs = new Set(validOtakuResults.map(r => r.slug));
      const anilistExtras = anilistResults.filter(r => {
        // Include AniList entries that aren't already covered by Otakudesu results
        const titleNorm = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        return !validOtakuResults.some(or =>
          or.title.toLowerCase().replace(/[^a-z0-9]/g, '') === titleNorm
        );
      });
      finalResults = [...validOtakuResults, ...anilistExtras];
    } else {
      // Only AniList responded — use it (always proper series, never episodes)
      finalResults = anilistResults || [];
    }

    return res.json({ success: true, source: 'combined', query: q, data: finalResults });

  } catch (err) {
    console.error('[routes/anime] /search error:', err.message);
    try {
      const anilistData = await anilist.searchAnime(q, 1, 50);
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
