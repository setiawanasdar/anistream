'use strict';

/**
 * Otakudesu Scraper (Optimized & Resilient)
 * Base domain: https://otakudesu.cloud (configurable via OTAKUDESU_URL env var)
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { sources } = require('../config/sources');

function getBaseUrl() {
  return sources.otakudesu.baseUrl || 'https://otakudesu.cloud';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract anime slug from URL.
 * Handles:
 *   https://otakudesu.cloud/anime/solo-leveling-sub-indo/ -> 'solo-leveling-sub-indo'
 *   https://otakudesu.cloud/episode/solo-leveling-episode-1-sub-indo/ -> 'solo-leveling-sub-indo'
 */
function extractSlug(url = '') {
  if (!url) return '';
  const animeMatch = url.match(/\/anime\/([^/]+)\/?$/);
  if (animeMatch) return animeMatch[1];

  const epMatch = url.match(/\/episode\/([^/]+)\/?$/);
  if (epMatch) {
    // Strip episode suffix to get base anime slug if possible
    return epMatch[1].replace(/-episode-\d+.*$/i, '-sub-indo').replace(/-sub-indo-.*$/i, '-sub-indo');
  }

  const clean = url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
  return clean.split('/').pop() || url;
}

/**
 * Extract episode slug from URL.
 * e.g. https://otakudesu.cloud/episode/naruto-episode-1-sub-indo/ -> 'naruto-episode-1-sub-indo'
 */
function extractEpisodeSlug(url = '') {
  if (!url) return '';
  const match = url.match(/\/episode\/([^/]+)\/?$/);
  return match ? match[1] : url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
}

/**
 * Parse an anime card element from list/catalog pages.
 */
function parseCard($, el) {
  const $el = $(el);

  // Link & Slug
  const linkEl = $el.find('.thumb > a, .thumbz a, a').first();
  const href = linkEl.attr('href') || '';
  const slug = extractSlug(href);

  // Title: check card-specific title elements
  let title = $el.find('.jdlflm, .thumbz h2, h2.jdlflm, h2').first().text().trim();
  if (!title) {
    title = linkEl.attr('title') || '';
  }

  // Poster image
  const imgEl = $el.find('.thumbz img, .thumb img, img').first();
  const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

  // Episode badge
  const episode = $el.find('.epz, .epztipe').first().text().trim();

  // Type badge
  const type = $el.find('.epztipe').text().trim() || 'TV';

  // Rating
  const ratingText = $el.find('.epztipe, .score').text().trim();
  const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
  const rating = ratingMatch ? ratingMatch[1] : null;

  return {
    id: slug,
    title,
    slug,
    poster,
    type,
    status: null,
    episodes: episode || null,
    rating,
    genres: [],
    synopsis: null,
    studio: null,
    year: null,
  };
}

// ---------------------------------------------------------------------------
// Public Scraper Functions
// ---------------------------------------------------------------------------

/**
 * Get ongoing anime list.
 */
async function getOngoing() {
  try {
    const urls = [
      `${getBaseUrl()}/ongoing-anime/`,
      `${getBaseUrl()}/anime-terbaru/`,
      `${getBaseUrl()}/`,
    ];

    let results = [];

    for (const url of urls) {
      try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.venz ul li, .rapi ul li, .venutama ul li').each((_, el) => {
          const item = parseCard($, el);
          if (item.title && item.slug) {
            results.push({ ...item, status: 'Ongoing' });
          }
        });

        if (results.length > 0) break;
      } catch (e) {
        console.warn(`[otakudesu] getOngoing try url ${url} failed:`, e.message);
      }
    }

    // Deduplicate by slug
    const seen = new Set();
    return results.filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  } catch (err) {
    console.error('[otakudesu] getOngoing error:', err.message);
    return [];
  }
}

/**
 * Get completed anime list.
 */
async function getComplete() {
  try {
    const urls = [
      `${getBaseUrl()}/complete-anime/`,
      `${getBaseUrl()}/anime-tamat/`,
    ];

    let results = [];

    for (const url of urls) {
      try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        $('.venz ul li, .rapi ul li, .venutama ul li').each((_, el) => {
          const item = parseCard($, el);
          if (item.title && item.slug) {
            results.push({ ...item, status: 'Completed' });
          }
        });

        if (results.length > 0) break;
      } catch (e) {
        console.warn(`[otakudesu] getComplete try url ${url} failed:`, e.message);
      }
    }

    const seen = new Set();
    return results.filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  } catch (err) {
    console.error('[otakudesu] getComplete error:', err.message);
    return [];
  }
}

/**
 * Get popular anime.
 */
async function getPopular() {
  try {
    const url = getBaseUrl() + '/';
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.venz ul li, .bixbox .listupd article, .rapi ul li, .venutama ul li').each((_, el) => {
      const item = parseCard($, el);
      if (item.title && item.slug) results.push(item);
    });

    const seen = new Set();
    return results.filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  } catch (err) {
    console.error('[otakudesu] getPopular error:', err.message);
    return [];
  }
}

/**
 * Search anime by keyword.
 */
async function searchAnime(query) {
  try {
    const url = `${getBaseUrl()}/?s=${encodeURIComponent(query)}&post_type=anime`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.chivsrc ul li, .venz ul li').each((_, el) => {
      const $el = $(el);

      const linkEl = $el.find('h2 a, .thumb a, a').first();
      const title = linkEl.text().trim() || $el.find('h2').first().text().trim();
      const href = linkEl.attr('href') || '';
      const slug = extractSlug(href);

      const imgEl = $el.find('img');
      const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

      const spans = $el.find('.set, li span');
      const genreText = spans.eq(1).text().replace(/Genres?:/i, '').trim();
      const statusText = spans.eq(2).text().replace(/Status:/i, '').trim();
      const ratingText = spans.eq(3).text().replace(/Rating:/i, '').trim();

      if (title && slug) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: 'TV',
          status: statusText || 'Unknown',
          episodes: null,
          rating: ratingText || null,
          genres: genreText ? genreText.split(',').map((g) => g.trim()).filter(Boolean) : [],
          synopsis: null,
          studio: null,
          year: null,
        });
      }
    });

    return results;
  } catch (err) {
    console.error('[otakudesu] searchAnime error:', err.message);
    return [];
  }
}

/**
 * Get full anime detail page.
 */
async function getAnimeDetail(slug) {
  try {
    const url = `${getBaseUrl()}/anime/${slug}/`;
    const html = await fetchHtml(url, { referer: getBaseUrl() });
    const $ = cheerio.load(html);

    // Parse info block inside .infozin
    const info = {};
    $('.infozin p, .infoz p, .infozin span').each((_, el) => {
      const text = $(el).text();
      const colon = text.indexOf(':');
      if (colon === -1) return;
      const key = text.slice(0, colon).trim().toLowerCase();
      const value = text.slice(colon + 1).trim();
      info[key] = value;
    });

    // Poster
    const poster =
      $('.fotoanime img').attr('data-src') ||
      $('.fotoanime img').attr('src') ||
      $('.thumb img').attr('src') ||
      '';

    // Title: NEVER use site-wide logo/header title
    let title =
      info['judul'] ||
      info['title'] ||
      $('.jdlsub').text().trim() ||
      $('.fotoanime h1.jdlflm').text().trim() ||
      $('.entry-title').text().trim() ||
      '';

    // If title is missing or contains site name, beautify slug
    if (!title || title.toLowerCase().includes('otakudesu')) {
      title = slug
        .replace(/-sub-indo$/i, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const altTitle = info['japanese'] || info['japanese:'] || null;

    // Synopsis
    const synopsis =
      $('.sinopc p').text().trim() ||
      $('.sinopc').text().trim() ||
      $('#venkonten .sinopc').text().trim() ||
      '';

    const rating = info['skor'] || info['score'] || info['rating'] || null;
    const type = info['tipe'] || info['type'] || 'TV';
    const status = info['status'] || null;
    const episodes = info['total episode'] || info['episode'] || info['total_episode'] || null;
    const studio = info['studio'] || null;
    const year = info['tanggal rilis'] || info['aired'] || info['release_date'] || null;
    const genreRaw = info['genre'] || info['genres'] || '';
    const genres = genreRaw
      ? genreRaw.split(',').map((g) => g.trim()).filter(Boolean)
      : [];

    // Episode list: parse all available episodes
    const episodeList = [];
    $('.episodelist ul li, #_epslist ul li, .venser .episodelist ul li').each((idx, el) => {
      const $el = $(el);
      const a = $el.find('a');
      const epTitle = a.text().trim();
      const epHref = a.attr('href') || '';
      const epSlug = extractEpisodeSlug(epHref);
      const epDate = $el.find('.zeebr').text().trim();

      if (epTitle && epSlug && epHref.includes('/episode/')) {
        // Extract episode number
        const numMatch = epTitle.match(/Episode\s*(\d+(\.\d+)?)/i) || epSlug.match(/episode-(\d+)/i);
        const episode_number = numMatch ? numMatch[1] : `${idx + 1}`;

        episodeList.push({
          title: epTitle,
          slug: epSlug,
          episode_number,
          date: epDate,
        });
      }
    });

    // Batch download links
    const batchLinks = [];
    $('.batchlink ul li a').each((_, el) => {
      const $a = $(el);
      batchLinks.push({ label: $a.text().trim(), url: $a.attr('href') || '' });
    });

    const result = {
      id: slug,
      title,
      alt_title: altTitle,
      slug,
      poster,
      backdrop: poster,
      type,
      status,
      episodes,
      rating,
      genres,
      synopsis,
      studio,
      year,
      episodeList,
      episodes_list: episodeList, // support both naming conventions
      batchLinks,
    };

    return result;
  } catch (err) {
    console.error('[otakudesu] getAnimeDetail error:', err.message);
    return null;
  }
}

/**
 * Get episode streaming data.
 */
async function getEpisode(slug) {
  try {
    const url = `${getBaseUrl()}/episode/${slug}/`;
    const html = await fetchHtml(url, { referer: getBaseUrl() });
    const $ = cheerio.load(html);

    // Episode title
    let title =
      $('.posttl').text().trim() ||
      $('.jdlsub').text().trim() ||
      $('.venutama h1').text().trim() ||
      $('h1.entry-title').text().trim() ||
      '';

    if (!title || title.toLowerCase().includes('otakudesu')) {
      title = slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Parent anime link
    const animeHref = $('.kategoz a, .flir a, .breadcrumb a').last().attr('href') || '';
    const animeSlug = extractSlug(animeHref);
    const animeTitle = $('.kategoz a, .flir a').last().text().trim() || animeSlug.replace(/-/g, ' ');

    // Navigation
    const prevHref = $('.cukder .tleft a, .naveps .prev a').attr('href') || '';
    const nextHref = $('.cukder .tright a, .naveps .next a').attr('href') || '';
    const prevSlug = prevHref ? extractEpisodeSlug(prevHref) : null;
    const nextSlug = nextHref ? extractEpisodeSlug(nextHref) : null;

    // Stream servers & video sources
    const servers = [];

    // 1. Direct Embed / Iframe on page
    const directIframes = [];
    $('#embed_holder iframe, .responsive-embed-stream iframe, div#embed-player iframe, iframe[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src && !src.includes('googleads') && !src.includes('doubleclick') && !directIframes.includes(src)) {
        directIframes.push(src);
      }
    });

    if (directIframes.length > 0) {
      directIframes.forEach((src, idx) => {
        servers.push({
          server: `Player Utama ${idx > 0 ? idx + 1 : ''}`.trim(),
          streams: [
            { quality: 'HD', url: src },
            { quality: '720p', url: src },
            { quality: '480p', url: src },
            { quality: '360p', url: src },
          ],
        });
      });
    }

    // 2. Mirror servers
    $('.mirrorstream ul.muvid li, .mirrorstream ul li').each((idx, el) => {
      const $el = $(el);
      const label = $el.find('a, span, button').first().text().trim() || `Mirror ${idx + 1}`;
      const raw = $el.find('a, span, button').first().attr('data-content') || '';

      let embedUrl = '';
      if (raw) {
        try {
          const decoded = Buffer.from(raw, 'base64').toString('utf-8');
          const $inner = cheerio.load(decoded);
          embedUrl = $inner('iframe').attr('src') || decoded.trim();
        } catch {
          embedUrl = raw;
        }
      }

      if (embedUrl && embedUrl.startsWith('http')) {
        servers.push({
          server: label,
          streams: [
            { quality: 'HD', url: embedUrl },
            { quality: '720p', url: embedUrl },
            { quality: '480p', url: embedUrl },
          ],
        });
      }
    });

    // 3. Download links
    const downloads = [];
    $('.download ul li, .listdownload ul li').each((_, el) => {
      const $el = $(el);
      const quality = $el.find('strong, b').text().trim() || 'HD';
      const links = [];
      $el.find('a').each((__, a) => {
        const host = $(a).text().trim();
        const href = $(a).attr('href') || '';
        if (href && host) {
          links.push({ host, url: href });
        }
      });
      if (links.length > 0) {
        downloads.push({ quality, links });
      }
    });

    // If no direct embed was found, use the first download host as stream fallback
    if (servers.length === 0 && downloads.length > 0) {
      downloads.forEach((dl) => {
        dl.links.forEach((link) => {
          servers.push({
            server: `${link.host} (${dl.quality})`,
            streams: [{ quality: dl.quality, url: link.url }],
          });
        });
      });
    }

    return {
      title,
      slug,
      anime: animeTitle,
      animeSlug,
      prev_episode: prevSlug,
      next_episode: nextSlug,
      prevEpisode: prevSlug,
      nextEpisode: nextSlug,
      servers,
      downloads,
    };
  } catch (err) {
    console.error('[otakudesu] getEpisode error:', err.message);
    return null;
  }
}

/**
 * Get weekly release schedule.
 */
async function getSchedule() {
  try {
    const url = `${getBaseUrl()}/jadwal-rilis/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const dayMap = {
      senin: 'Senin',
      selasa: 'Selasa',
      rabu: 'Rabu',
      kamis: 'Kamis',
      jumat: 'Jumat',
      sabtu: 'Sabtu',
      minggu: 'Minggu',
    };

    const schedule = [];

    $('.kgjdwl, .venser .venutama').each((_, el) => {
      const $el = $(el);
      const rawDay = $el.find('h2, .kgtitle').text().trim().toLowerCase();
      const day = dayMap[rawDay] || rawDay;
      const animes = [];

      $el.find('ul li a, li a').each((__, a) => {
        const title = $(a).text().trim();
        const href = $(a).attr('href') || '';
        const slug = extractSlug(href);
        if (title && slug) {
          animes.push({ title, slug, episode: 'Airing', time: '', poster: '' });
        }
      });

      if (animes.length > 0) {
        schedule.push({ day, animes });
      }
    });

    return schedule;
  } catch (err) {
    console.error('[otakudesu] getSchedule error:', err.message);
    return [];
  }
}

/**
 * Get all genres.
 */
async function getGenres() {
  try {
    const url = `${getBaseUrl()}/genre-list/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const genres = [];

    $('.genrelist ul li a, .genres ul li a, .genres a').each((_, el) => {
      const $a = $(el);
      const name = $a.text().trim();
      const href = $a.attr('href') || '';
      const slugMatch = href.match(/\/genres?\/([^/]+)\/?$/);
      const slug = slugMatch ? slugMatch[1] : name.toLowerCase().replace(/\s+/g, '-');
      if (name) genres.push({ name, slug });
    });

    return genres;
  } catch (err) {
    console.error('[otakudesu] getGenres error:', err.message);
    return [];
  }
}

/**
 * Get anime by genre.
 */
async function getGenreAnime(slug, page = 1) {
  try {
    const base = `${getBaseUrl()}/genres/${slug}/`;
    const url = page > 1 ? `${base}page/${page}/` : base;
    const html = await fetchHtml(url, { referer: base });
    const $ = cheerio.load(html);
    const results = [];

    $('.venz ul li, .rapi ul li, .venutama ul li').each((_, el) => {
      const item = parseCard($, el);
      if (item.title && item.slug) results.push(item);
    });

    const hasNextPage = $('.pagination .page-numbers.next, .pagination a.next').length > 0;
    return { results, page, hasNextPage };
  } catch (err) {
    console.error('[otakudesu] getGenreAnime error:', err.message);
    return { results: [], page, hasNextPage: false };
  }
}

module.exports = {
  getOngoing,
  getComplete,
  getPopular,
  searchAnime,
  getAnimeDetail,
  getEpisode,
  getSchedule,
  getGenres,
  getGenreAnime,
};
