'use strict';

/**
 * Episode routes with Multi-Source Resilience
 * Mounted at: /api/episode
 *
 * Strategy:
 *  1. Try Otakudesu scraper (with 4s fast timeout) in parallel with AniList ID lookup.
 *  2. Build robust server list:
 *       a) vidsrc.me   (universal HD, uses AniList ID) — 100% active for all anime
 *       b) vidsrc.pm   (backup HD)
 *       c) Any valid iframe streams scraped from Otakudesu (whitelisted, non-blocking)
 *  3. Return merged data immediately.
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

function extractEpisodeNumber(slug) {
  const m1 = slug.match(/episode[- _](\d+(?:\.\d+)?)/i);
  if (m1) return m1[1];
  const m2 = slug.match(/(\d+)[^0-9]*$/);
  if (m2) return m2[1];
  return '1';
}

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
    const cleanSlug = decodeURIComponent(slug)
      .replace(/^https?:\/\/[^/]+\/episode\//, '')
      .replace(/\/$/, '');

    const epNum = extractEpisodeNumber(cleanSlug);
    const animeName = extractAnimeName(cleanSlug);

    // Run scraper with 4s fast timeout and AniList resolution concurrently
    const scraperPromise = Promise.race([
      withFallback(fallbackOrder, 'getEpisode', slug),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Scraper timeout')), 4000)),
    ]).catch(() => null);

    const [scraperResult, anilistResult] = await Promise.allSettled([
      scraperPromise,
      resolveAnilistId(animeName),
    ]);

    const scraperData = scraperResult.status === 'fulfilled' && scraperResult.value ? scraperResult.value.data : null;
    let aniInfo = anilistResult.status === 'fulfilled' ? anilistResult.value : null;

    // If ID not resolved from slug, try scraperData.anime if available
    if (!aniInfo && scraperData && scraperData.anime) {
      aniInfo = await resolveAnilistId(scraperData.anime).catch(() => null);
    }

    const malId = (typeof aniInfo === 'object' && aniInfo?.malId) || (typeof aniInfo === 'number' ? aniInfo : aniInfo?.anilistId);
    const aniId = (typeof aniInfo === 'object' && aniInfo?.anilistId) || (typeof aniInfo === 'number' ? aniInfo : null);

    // --- Step 2: Build servers list ---
    const servers = [];

    const BLOCKED_STREAM_DOMAINS = [
      'mediafire', 'acefile', 'gdrive', 'drive.google',
      'zippyshare', 'kumpulbagi', 'otakufiles', 'racaty', 'letsupload',
      'hxfile', 'hexupload', 'fembed', 'uplod', 'moevideo', 'upfile',
      'gofile.io', 'uploadgram', 'clicknupload', 'mirrorace',
      'desustream', 'desudrive', 'desu60', 'desufast', 'desuarchive',
      'okstream', 'okestream', 'shinobicdn', 'streamsss',
      'streamcrypt', 'streamlare', 'streamgg', 'streamta',
      'yourupload', 'mixdrop', 'vidoza', 'upstream', 'vudeo',
    ];

    // A. Add valid Sub Indo streams from scraper (Filedon, Vidhide, Mega Embed, etc.)
    if (scraperData && Array.isArray(scraperData.servers)) {
      for (const s of scraperData.servers) {
        if (s && Array.isArray(s.streams) && s.streams.length > 0) {
          const validStreams = s.streams.filter((st) => {
            const url = (st.url || '').toLowerCase();
            if (!url.startsWith('http')) return false;
            // Allow mega embed player, block download files
            if (url.includes('mega.nz/file') || url.includes('mega.nz/#!')) return false;
            return !BLOCKED_STREAM_DOMAINS.some((domain) => url.includes(domain));
          });
          if (validStreams.length > 0) {
            const serverName = s.server.startsWith('Sub Indo')
              ? s.server
              : `Sub Indo - ${s.server}`;
            servers.push({
              server: serverName,
              streams: validStreams,
            });
          }
        }
      }
    }

    // B. Add Universal HD players (VidLink + SmashyStream Multi-Source)
    if (malId) {
      servers.push({
        server: '▶ Server HD 1 (Multi-Quality Sub)',
        streams: [
          { quality: '1080p', url: `https://vidlink.pro/anime/${malId}/${epNum}/sub` },
          { quality: '720p', url: `https://vidlink.pro/anime/${malId}/${epNum}/sub` },
          { quality: 'HD', url: `https://vidlink.pro/anime/${malId}/${epNum}/sub` },
        ],
      });

      servers.push({
        server: '▶ Server HD 2 (SmashyStream HD)',
        streams: [
          { quality: '1080p', url: `https://embed.smashystream.com/playere.php?tmdb=0&mal=${malId}&ep=${epNum}` },
          { quality: '720p', url: `https://embed.smashystream.com/playere.php?tmdb=0&mal=${malId}&ep=${epNum}` },
          { quality: 'HD', url: `https://embed.smashystream.com/playere.php?tmdb=0&mal=${malId}&ep=${epNum}` },
        ],
      });

      servers.push({
        server: '▶ Server HD 3 (Multi-Quality Dub)',
        streams: [
          { quality: '1080p', url: `https://vidlink.pro/anime/${malId}/${epNum}/dub` },
          { quality: '720p', url: `https://vidlink.pro/anime/${malId}/${epNum}/dub` },
          { quality: 'HD', url: `https://vidlink.pro/anime/${malId}/${epNum}/dub` },
        ],
      });
    }

    // Fallback: If still 0 servers and no malId, try alt resolution
    if (servers.length === 0) {
      const altInfo = await resolveAnilistId(cleanSlug.replace(/-/g, ' ')).catch(() => null);
      const altId = (typeof altInfo === 'object' && altInfo?.malId) || (typeof altInfo === 'number' ? altInfo : altInfo?.anilistId);
      if (altId) {
        servers.push({
          server: '▶ Server HD 1',
          streams: [
            { quality: 'HD', url: `https://vidlink.pro/anime/${altId}/${epNum}/sub` },
          ],
        });
      }
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
    const titleFormatted = (scraperData?.anime || animeName)
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
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
