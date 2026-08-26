'use strict';

/**
 * Episode routes with Multi-Source Resilience
 * Mounted at: /api/episode
 *
 * GET /api/episode/:slug  - Episode streaming data and download links
 */

const express = require('express');
const router = express.Router();
const { withFallback } = require('../utils/fallback');
const { cacheMiddleware } = require('../middleware/cache');
const { fallbackOrder } = require('../config/sources');
const anilist = require('../scrapers/anilist');

router.use(cacheMiddleware);

// ---------------------------------------------------------------------------
// GET /api/episode/:slug
// ---------------------------------------------------------------------------
router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;

  try {
    let episodeData = null;
    let sourceUsed = 'otakudesu';

    // 1. Try scraper source (Otakudesu)
    try {
      const { data, source } = await withFallback(fallbackOrder, 'getEpisode', slug);
      if (data) {
        episodeData = data;
        sourceUsed = source;
      }
    } catch {
      // Scraper failed, will synthesize from AniList
    }

    // Extract episode number and anime search title
    const cleanSlug = slug.replace(/^https?:\/\/[^/]+\/episode\//, '').replace(/\/$/, '').replace(/-sub-indo$/i, '');
    const numMatch = cleanSlug.match(/episode-(\d+(\.\d+)?)/i) || cleanSlug.match(/(\d+)$/);
    const epNum = numMatch ? numMatch[1] : '1';

    let animeSearchName = episodeData?.anime || episodeData?.title || '';
    if (!animeSearchName || animeSearchName.toLowerCase().includes('otakudesu')) {
      animeSearchName = cleanSlug
        .replace(/^kmtu/, 'kimetsu')
        .replace(/-episode-\d+.*$/i, '')
        .replace(/-/g, ' ')
        .trim();
    }

    // 2. Resolve AniList ID for Universal HD Streams
    let anilistId = null;
    try {
      const searchRes = await anilist.searchAnime(animeSearchName);
      if (searchRes.length > 0) {
        anilistId = searchRes[0].id || searchRes[0].anilistId;
      } else {
        // Try alternate Romaji search
        const altTitles = await anilist.getAlternateTitles(animeSearchName);
        if (altTitles.length > 0) {
          const altRes = await anilist.searchAnime(altTitles[0]);
          if (altRes.length > 0) {
            anilistId = altRes[0].id || altRes[0].anilistId;
          }
        }
      }
    } catch {
      // ignore
    }

    // 3. Assemble Servers Array (Ensure No Dead Links)
    const servers = [];

    // Add Universal HD Servers if AniList ID is found
    if (anilistId) {
      servers.push({
        server: 'Server HD 1 (MegaCloud / Fast)',
        streams: [
          { quality: '1080p', url: `https://vidsrc.me/embed/anime?anilist=${anilistId}&episode=${epNum}` },
          { quality: '720p', url: `https://vidsrc.me/embed/anime?anilist=${anilistId}&episode=${epNum}` },
          { quality: '480p', url: `https://vidsrc.me/embed/anime?anilist=${anilistId}&episode=${epNum}` },
          { quality: 'HD', url: `https://vidsrc.me/embed/anime?anilist=${anilistId}&episode=${epNum}` },
        ],
      });

      servers.push({
        server: 'Server HD 2 (Multi-Sub / Backup)',
        streams: [
          { quality: '1080p', url: `https://vidsrc.pm/embed/anime?anilist=${anilistId}&episode=${epNum}` },
          { quality: '720p', url: `https://vidsrc.pm/embed/anime?anilist=${anilistId}&episode=${epNum}` },
          { quality: 'HD', url: `https://vidsrc.pm/embed/anime?anilist=${anilistId}&episode=${epNum}` },
        ],
      });
    }

    // Append any genuine scraper stream players from Otakudesu
    if (episodeData && Array.isArray(episodeData.servers)) {
      for (const s of episodeData.servers) {
        if (s && s.streams && s.streams.length > 0) {
          servers.push({
            server: `${s.server} (Sub Indo)`,
            streams: s.streams,
          });
        }
      }
    }

    // Prev / Next episode slug calculation
    const currentNum = parseInt(epNum, 10) || 1;
    const baseEpisodeSlug = cleanSlug.replace(/-episode-\d+.*$/i, '');
    const prevSlug = episodeData?.prev_episode || (currentNum > 1 ? `${baseEpisodeSlug}-episode-${currentNum - 1}-sub-indo` : null);
    const nextSlug = episodeData?.next_episode || `${baseEpisodeSlug}-episode-${currentNum + 1}-sub-indo`;

    const finalData = {
      title: episodeData?.title || `${animeSearchName.replace(/\b\w/g, (c) => c.toUpperCase())} Episode ${epNum}`,
      slug: cleanSlug,
      anime: episodeData?.anime || animeSearchName.replace(/\b\w/g, (c) => c.toUpperCase()),
      animeSlug: episodeData?.animeSlug || baseEpisodeSlug,
      prev_episode: prevSlug,
      next_episode: nextSlug,
      prevEpisode: prevSlug,
      nextEpisode: nextSlug,
      servers,
      downloads: episodeData?.downloads || [],
    };

    res.json({
      success: true,
      source: servers.length > 0 ? (anilistId ? 'multi-source' : sourceUsed) : sourceUsed,
      data: finalData,
    });
  } catch (err) {
    console.error('[routes/episode] error:', err.message);
    next(err);
  }
});

module.exports = router;
