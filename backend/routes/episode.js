'use strict';

/**
 * Episode routes with Multi-Source Resilience
 * Mounted at: /api/episode
 *
 * Strategy:
 *  1. Try Otakudesu scraper to get episode info + any working stream iframes.
 *  2. In parallel, resolve an AniList ID for the anime title.
 *  3. Build final server list:
 *       a) vidsrc.me   (universal HD, uses AniList ID) — always first if ID found
 *       b) vidsrc.pm   (backup, uses AniList ID)
 *       c) Any valid iframe streams scraped from Otakudesu
 *  4. Return merged data. Download links are kept separate (in `downloads`).
 *
 * GET /api/episode/:slug  - Episode streaming data and download links
 */

const express = require('express');
const router = express.Router();
const { withFallback } = require('../utils/fallback');
const { cacheMiddleware } = require('../middleware/cache');
const { fallbackOrder } = require('../config/sources');
const { resolveAnilistId } = require('../scrapers/anilist');

router.use(cacheMiddleware);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract episode number from a slug string.
 * Handles patterns like:
 *   steins-gate-episode-1-sub-indo
 *   one-piece-episode-1100-sub-indo
 *   sword-art-online-episode-1
 */
function extractEpisodeNumber(slug) {
  // Match "episode-<number>" pattern
  const m1 = slug.match(/episode[- _](\d+(?:\.\d+)?)/i);
  if (m1) return m1[1];
  // Fallback: trailing number
  const m2 = slug.match(/(\d+)[^0-9]*$/);
  if (m2) return m2[1];
  return '1';
}

/**
 * Extract a clean anime search name from a slug.
 * Removes: "episode-N", "sub-indo", trailing/leading dashes.
 */
function extractAnimeName(slug) {
  return slug
    .replace(/episode[- _]\d+(?:\.\d+)?.*/i, '')
    .replace(/sub[- _]?indo.*/i, '')
    .replace(/[- _]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// GET /api/episode/:slug
// ---------------------------------------------------------------------------
router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;

  try {
    // --- Step 1: Try Otakudesu (and fallback scrapers) in parallel with AniList ID lookup ---
    const cleanSlug = decodeURIComponent(slug)
      .replace(/^https?:\/\/[^/]+\/episode\//, '')
      .replace(/\/$/, '');

    const epNum = extractEpisodeNumber(cleanSlug);
    const animeName = extractAnimeName(cleanSlug);

    // Run scraper and AniList ID resolution concurrently
    const [scraperResult, anilistId] = await Promise.allSettled([
      withFallback(fallbackOrder, 'getEpisode', slug).catch(() => null),
      resolveAnilistId(animeName),
    ]);

    const scraperData = scraperResult.status === 'fulfilled' ? scraperResult.value?.data : null;
    const aniId = anilistId.status === 'fulfilled' ? anilistId.value : null;

    // --- Step 2: Build servers list ---
    const servers = [];

    // Universal HD players — always add if we have an AniList ID
    if (aniId) {
      servers.push({
        server: '▶ Server HD 1',
        streams: [
          { quality: 'HD', url: `https://vidsrc.me/embed/anime?anilist=${aniId}&episode=${epNum}` },
        ],
      });

      servers.push({
        server: '▶ Server HD 2 (Backup)',
        streams: [
          { quality: 'HD', url: `https://vidsrc.pm/embed/anime?anilist=${aniId}&episode=${epNum}` },
        ],
      });
    }

    // Otakudesu scraper streams (if any valid iframes exist)
    // Only include domains that allow iframe embedding in third-party sites
    const BLOCKED_STREAM_DOMAINS = [
      // Download hosts
      'mega.nz', 'mediafire', 'acefile', 'gdrive', 'drive.google',
      'zippyshare', 'kumpulbagi', 'otakufiles', 'racaty', 'letsupload',
      'hxfile', 'hexupload', 'fembed', 'uplod', 'moevideo', 'upfile',
      'gofile.io', 'uploadgram', 'clicknupload', 'mirrorace',
      // Servers that block X-Frame-Options (refuse to connect in iframe)
      'desustream', 'desudrive', 'desu60', 'desufast', 'desuarchive',
      'okstream', 'okestream', 'shinobicdn', 'streamsss',
      'streamcrypt', 'streamlare', 'streamgg', 'streamta',
      // Other download-redirect hosts
      'yourupload', 'mixdrop', 'vidoza', 'upstream', 'vudeo',
    ];

    if (scraperData && Array.isArray(scraperData.servers)) {
      for (const s of scraperData.servers) {
        if (s && Array.isArray(s.streams) && s.streams.length > 0) {
          const validStreams = s.streams.filter(st => {
            const url = (st.url || '').toLowerCase();
            if (!url.startsWith('http')) return false;
            return !BLOCKED_STREAM_DOMAINS.some(domain => url.includes(domain));
          });
          if (validStreams.length > 0) {
            servers.push({
              server: `Sub Indo - ${s.server}`,
              streams: validStreams,
            });
          }
        }
      }
    }

    // If NO servers at all, create a placeholder message server
    if (servers.length === 0) {
      servers.push({
        server: 'Tidak Tersedia',
        streams: [],
        message: 'Tidak ada stream yang tersedia untuk episode ini.',
      });
    }

    // --- Step 3: Build prev/next episode slugs ---
    const currentNum = parseInt(epNum, 10) || 1;
    const baseSlug = cleanSlug
      .replace(/episode[- _]\d+(?:\.\d+)?.*/i, '')
      .replace(/[- _]+$/, '');

    const prevSlug = scraperData?.prev_episode ||
      (currentNum > 1 ? `${baseSlug}-episode-${currentNum - 1}-sub-indo` : null);
    const nextSlug = scraperData?.next_episode ||
      `${baseSlug}-episode-${currentNum + 1}-sub-indo`;

    // --- Step 4: Assemble response ---
    const titleFormatted = animeName
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const finalData = {
      title: scraperData?.title || `${titleFormatted} Episode ${epNum}`,
      slug: cleanSlug,
      anime: scraperData?.anime || titleFormatted,
      animeSlug: scraperData?.animeSlug || baseSlug,
      episode: epNum,
      anilistId: aniId || null,
      prev_episode: prevSlug,
      next_episode: nextSlug,
      prevEpisode: prevSlug,
      nextEpisode: nextSlug,
      servers,
      downloads: scraperData?.downloads || [],
    };

    res.json({
      success: true,
      source: aniId ? 'multi-source' : 'otakudesu',
      data: finalData,
    });
  } catch (err) {
    console.error('[routes/episode] error:', err.message);
    next(err);
  }
});

module.exports = router;
