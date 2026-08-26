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

    // AniList search with retry (handles rate-limiting gracefully)
    async function anilistWithRetry(query, retries = 2) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const results = await anilist.searchAnime(query, 1, 50);
          if (results && results.length > 0) return results;
        } catch (err) {
          console.warn(`[search] AniList attempt ${attempt + 1} failed:`, err.message);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          }
        }
      }
      return [];
    }

    // Run both in parallel
    const [anilistResults, otakuResults] = await Promise.all([
      anilistWithRetry(q),
      Promise.race([
        otakudesu.searchAnime(q),
        new Promise(resolve => setTimeout(() => resolve([]), 8000)),
      ]).catch(() => []),
    ]);

    console.log(`[search] q="${q}" anilist=${anilistResults.length} otakudesu=${(otakuResults || []).length}`);

    // Filter Otakudesu: skip per-episode entries (title/slug contains "episode N")
    const validOtakuResults = (otakuResults || []).filter(item => {
      if (!item.title || !item.slug) return false;
      if (/episode\s*\d+/i.test(item.title)) return false;
      if (/episode-\d+/i.test(item.slug)) return false;
      return true;
    });

    // Merge strategy: AniList always included, Otakudesu enriches when available
    let finalResults;
    if (anilistResults.length > 0 && validOtakuResults.length > 0) {
      // Both: Otakudesu Sub Indo matches first, then AniList extras (deduplicated)
      const anilistExtras = anilistResults.filter(r => {
        const titleNorm = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        return !validOtakuResults.some(or =>
          or.title.toLowerCase().replace(/[^a-z0-9]/g, '') === titleNorm
        );
      });
      finalResults = [...validOtakuResults, ...anilistExtras];
    } else if (anilistResults.length > 0) {
      // Only AniList — always proper series, never episodes
      finalResults = anilistResults;
    } else if (validOtakuResults.length > 0) {
      // Only Otakudesu
      finalResults = validOtakuResults;
    } else {
      finalResults = [];
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
    // Run Indonesian scraper fallback and AniList resolution concurrently for blazing speed
    const scraperPromise = withFallback(fallbackOrder, 'getAnimeDetail', slug).catch(() => null);
    const anilistPromise = (async () => {
      try {
        if (/^\d+$/.test(slug)) return await anilist.getById(parseInt(slug, 10));
        const searchQuery = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const results = await anilist.searchAnime(searchQuery, 1, 3);
        return results && results[0] ? results[0] : null;
      } catch {
        return null;
      }
    })();

    const [scraperRes, anilistData] = await Promise.all([scraperPromise, anilistPromise]);

    // 1. If Indonesian scraper returned valid rich data, use it
    if (scraperRes && scraperRes.data) {
      const data = scraperRes.data;
      if (
        data.title &&
        data.poster &&
        Array.isArray(data.episodes_list) &&
        data.episodes_list.length > 0
      ) {
        const titleLower = data.title.toLowerCase();
        if (!titleLower.includes('gcms') && !titleLower.includes('request anime')) {
          return res.json({ success: true, source: scraperRes.source, data });
        }
      }
    }

    // 2. Fallback to AniList metadata with generated full episode list
    if (anilistData) {
      const epCount = parseInt(anilistData.episodes || '1', 10) || 1;
      const episodes = [];
      for (let i = 1; i <= epCount; i++) {
        const epSlug = `${anilistData.slug}-episode-${i}-sub-indo`;
        episodes.push({
          id: epSlug,
          title: `Episode ${i}`,
          slug: epSlug,
          episode: String(i),
          episode_number: String(i),
        });
      }

      return res.json({
        success: true,
        source: 'anilist',
        data: {
          ...anilistData,
          episodes: String(epCount),
          episodes_list: episodes,
          total_episodes: String(epCount),
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Anime not found' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
