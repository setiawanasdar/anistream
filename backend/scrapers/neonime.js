'use strict';

/**
 * Neonime Scraper
 * Base domain: https://neonime.fun (configurable via NEONIME_URL env var)
 *
 * Neonime uses a WordPress-based theme. All selectors are annotated.
 * SELECTOR key: search "// SELECTOR:" to find all selector comments.
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { sources } = require('../config/sources');

function getBaseUrl() {
  return sources.neonime.baseUrl;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAnimeSlug(url = '') {
  // https://neonime.fun/tvshows/naruto/ -> 'naruto'
  // https://neonime.fun/anime/naruto/  -> 'naruto'
  const m = url.match(/\/(?:tvshows|anime)\/([^/?#]+)\/?(?:\?|#|$)/);
  return m ? m[1] : '';
}

function extractEpisodeSlug(url = '') {
  const clean = url.replace(/\/$/, '');
  const parts  = clean.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Parse a Neonime anime card.
 *
 * SELECTOR: Card wrapper  – '.animposx article' OR '.bs .bsx'
 * SELECTOR: Title         – 'h2' inside card
 * SELECTOR: Poster        – 'img' inside '.limit'
 * SELECTOR: Type badge    – '.typez' OR '.typespe'
 * SELECTOR: Episode badge – '.epx' OR '.ep'
 * SELECTOR: Rating        – '.score' OR '.rt'
 * SELECTOR: Link          – 'a' first child of card
 */
function parseCard($, el) {
  const $el = $(el);

  // SELECTOR: Title
  const title = $el.find('h2').first().text().trim();

  // SELECTOR: Link
  const href = $el.find('a').first().attr('href') || '';
  const slug = extractAnimeSlug(href);

  // SELECTOR: Poster
  const imgEl = $el.find('.limit img, img').first();
  const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

  // SELECTOR: Type badge
  const type = $el.find('.typez, .typespe').text().trim() || 'TV';

  // SELECTOR: Episode badge
  const episode = $el.find('.epx, .ep').text().trim();

  // SELECTOR: Rating
  const rating = $el.find('.score, .rt').text().trim();

  return {
    id: slug,
    title,
    slug,
    poster,
    type,
    status: null,
    episodes: episode || null,
    rating: rating || null,
    genres: [],
    synopsis: null,
    studio: null,
    year: null,
  };
}

// ---------------------------------------------------------------------------
// Public scraper functions
// ---------------------------------------------------------------------------

/**
 * Get ongoing anime.
 * Page: /episode/ (latest episodes) OR /tvshows/?status=ongoing
 *
 * SELECTOR: Card wrapper – '.animposx article' OR '.listupd article'
 */
async function getOngoing() {
  try {
    const urls = [
      `${getBaseUrl()}/episode/`,
      `${getBaseUrl()}/tvshows/?status=Ongoing`,
      `${getBaseUrl()}/`,
    ];

    for (const url of urls) {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const results = [];

      // SELECTOR: Card list
      $('.animposx article, .listupd article, .bs .bsx').each((_, el) => {
        const item = parseCard($, el);
        if (item.title) results.push({ ...item, status: 'Ongoing' });
      });

      if (results.length > 0) return results;
    }
    return [];
  } catch (err) {
    console.error('[neonime] getOngoing error:', err.message);
    return [];
  }
}

/**
 * Get completed anime.
 * Page: /tvshows/?status=completed
 *
 * SELECTOR: Same card structure
 */
async function getComplete() {
  try {
    const urls = [
      `${getBaseUrl()}/tvshows/?status=Completed`,
      `${getBaseUrl()}/movies/`,
    ];

    for (const url of urls) {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const results = [];

      $('.animposx article, .listupd article, .bs .bsx').each((_, el) => {
        const item = parseCard($, el);
        if (item.title) results.push({ ...item, status: 'Completed' });
      });

      if (results.length > 0) return results;
    }
    return [];
  } catch (err) {
    console.error('[neonime] getComplete error:', err.message);
    return [];
  }
}

/**
 * Get popular anime.
 * Neonime has a popular/trending widget or a dedicated page.
 * SELECTOR: '.wpop-weekly ul li' OR '.popular-posts ul li'
 */
async function getPopular() {
  try {
    const url = `${getBaseUrl()}/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    // SELECTOR: Popular widget list items
    $('.wpop-weekly ul li, .popular-posts ul li').each((_, el) => {
      const $el = $(el);
      const a   = $el.find('a').first();
      const title = $el.find('h2, .popular-title').text().trim() || a.attr('title') || '';
      const href  = a.attr('href') || '';
      const slug  = extractAnimeSlug(href);
      const poster = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
      const rating = $el.find('.score, .rt').text().trim();
      if (title) {
        results.push({
          id: slug, title, slug, poster, type: 'TV', status: null,
          episodes: null, rating: rating || null, genres: [], synopsis: null, studio: null, year: null,
        });
      }
    });

    // Fallback: grid cards
    if (results.length === 0) {
      $('.animposx article, .listupd article').each((_, el) => {
        const item = parseCard($, el);
        if (item.title) results.push(item);
      });
    }

    return results;
  } catch (err) {
    console.error('[neonime] getPopular error:', err.message);
    return [];
  }
}

/**
 * Search anime.
 * URL: /?s=<query>
 *
 * SELECTOR: '.animposx article' OR '.search-page article'
 */
async function searchAnime(query) {
  try {
    const url = `${getBaseUrl()}/?s=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.animposx article, .listupd article, .search-page article, .bs .bsx').each((_, el) => {
      const item = parseCard($, el);
      if (item.title) results.push(item);
    });

    return results;
  } catch (err) {
    console.error('[neonime] searchAnime error:', err.message);
    return [];
  }
}

/**
 * Get anime detail page.
 * URL: /tvshows/<slug>/
 *
 * SELECTOR: Title     – '.infox h1' OR 'h1.entry-title'
 * SELECTOR: Poster    – '.thumb img' OR '.poster img'
 * SELECTOR: Synopsis  – '.entry-content p' OR '.sinopsis p'
 * SELECTOR: Info rows – '.infox .spe span' (label:value format)
 * SELECTOR: Genres    – '.infox .genre a' OR '.genxed a'
 * SELECTOR: Episode list – '#eplist li a'
 *   SELECTOR: Ep number – '.epl-num'
 *   SELECTOR: Ep title  – '.epl-title'
 *   SELECTOR: Ep date   – '.epl-date'
 */
async function getAnimeDetail(slug) {
  try {
    const url = `${getBaseUrl()}/tvshows/${slug}/`;
    const html = await fetchHtml(url, { referer: getBaseUrl() });
    const $ = cheerio.load(html);

    // SELECTOR: Title
    const title = $('.infox h1').text().trim()
      || $('h1.entry-title').text().trim()
      || $('h1').first().text().trim();

    // SELECTOR: Poster
    const poster = $('.thumb img').attr('data-src')
      || $('.thumb img').attr('src')
      || $('.poster img').attr('src')
      || '';

    // SELECTOR: Synopsis
    const synopsis = $('.entry-content p').first().text().trim()
      || $('.sinopsis p').text().trim()
      || '';

    // SELECTOR: Info spans – each <span> is "Label: Value"
    const info = {};
    $('.infox .spe span').each((_, el) => {
      const text   = $(el).text();
      const colon  = text.indexOf(':');
      if (colon === -1) return;
      const key    = text.slice(0, colon).trim().toLowerCase();
      const value  = text.slice(colon + 1).trim();
      if (key) info[key] = value;
    });

    // SELECTOR: Genres
    const genres = [];
    $('.infox .genre a, .genxed a').each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });

    const rating   = info['score'] || info['skor'] || null;
    const type     = info['type'] || info['tipe'] || null;
    const status   = info['status'] || null;
    const episodes = info['episodes'] || info['episode'] || null;
    const studio   = info['studio'] || null;
    const year     = info['released'] || info['aired'] || null;

    // SELECTOR: Episode list
    const episodeList = [];
    $('#eplist li').each((_, el) => {
      const $el    = $(el);
      const a      = $el.find('a');
      const href   = a.attr('href') || '';
      const epSlug = extractEpisodeSlug(href);
      const epNum  = $el.find('.epl-num').text().trim();
      const epTitle = $el.find('.epl-title').text().trim() || a.text().trim();
      const epDate  = $el.find('.epl-date').text().trim();
      if (epTitle) {
        episodeList.push({ title: epTitle, number: epNum, slug: epSlug, date: epDate });
      }
    });

    return {
      id: slug,
      title,
      slug,
      poster,
      type,
      status,
      episodes,
      rating,
      genres,
      synopsis,
      studio,
      year,
      episodeList,
      batchLinks: [],
    };
  } catch (err) {
    console.error('[neonime] getAnimeDetail error:', err.message);
    return null;
  }
}

/**
 * Get episode streaming data.
 * URL: /<slug>/
 *
 * SELECTOR: Server list  – '.server-list .serverops button[data-content]'
 *   OR '.episodelist .mirror ul li'
 * SELECTOR: Fallback iframe – '.player-embed iframe'
 * SELECTOR: Download links  – '.download .bixbox .smokeurl a'
 *
 * SELECTOR: Navigation
 *   Prev: '.navi-prev a'
 *   Next: '.navi-next a'
 */
async function getEpisode(slug) {
  try {
    const url = `${getBaseUrl()}/${slug}/`;
    const html = await fetchHtml(url, { referer: getBaseUrl() });
    const $ = cheerio.load(html);

    // SELECTOR: Episode title
    const title = $('h1.entry-title').text().trim() || $('h1').first().text().trim();

    // SELECTOR: Parent anime link
    const animeHref = $('.cat-series a, .breadcrumb a').eq(-2).attr('href') || '';
    const animeSlug = extractAnimeSlug(animeHref);

    // SELECTOR: Navigation
    const prevSlug = extractEpisodeSlug($('.navi-prev a').attr('href') || '');
    const nextSlug = extractEpisodeSlug($('.navi-next a').attr('href') || '');

    // SELECTOR: Server list
    const servers = [];
    $('.server-list .serverops button[data-content], .mirror ul li button[data-content]').each((_, el) => {
      const $btn   = $(el);
      const label  = $btn.text().trim() || `Server ${servers.length + 1}`;
      const raw    = $btn.attr('data-content') || '';
      let embedUrl = '';
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf-8');
        const $inner  = cheerio.load(decoded);
        embedUrl = $inner('iframe').attr('src') || decoded.trim();
      } catch {
        embedUrl = raw;
      }
      servers.push({ label, embedUrl });
    });

    // SELECTOR: Fallback iframe
    if (servers.length === 0) {
      $('.player-embed iframe, #player iframe').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (src) servers.push({ label: 'Embed', embedUrl: src });
      });
    }

    // SELECTOR: Download links
    const downloads = [];
    // SELECTOR: '.download .bixbox' groups by quality, then '.smokeurl a' for individual links
    $('.download .bixbox').each((_, box) => {
      const $box    = $(box);
      const quality = $box.find('h3, h4, strong').first().text().trim();
      const links   = [];
      $box.find('.smokeurl a, a').each((__, a) => {
        const href = $(a).attr('href') || '';
        if (href && !href.startsWith('#')) {
          links.push({ host: $(a).text().trim(), url: href });
        }
      });
      if (quality && links.length) downloads.push({ quality, links });
    });

    return {
      title,
      slug,
      animeSlug,
      prevEpisode: prevSlug || null,
      nextEpisode: nextSlug || null,
      servers,
      videoFile: null,
      downloads,
    };
  } catch (err) {
    console.error('[neonime] getEpisode error:', err.message);
    return null;
  }
}

/**
 * Get weekly schedule.
 * URL: /jadwal-tayang-anime-di-neonime/
 *
 * SELECTOR: Day column/block structure (varies; try both patterns)
 */
async function getSchedule() {
  try {
    const urls = [
      `${getBaseUrl()}/jadwal-tayang-anime-di-neonime/`,
      `${getBaseUrl()}/jadwal/`,
    ];
    const schedule = {};

    for (const url of urls) {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      // SELECTOR: Table pattern
      const headers = [];
      $('table thead th').each((_, th) => headers.push($(th).text().trim().toLowerCase()));

      if (headers.length > 0) {
        headers.forEach((h) => { schedule[h] = []; });
        $('table tbody tr').each((_, tr) => {
          $(tr).find('td').each((i, td) => {
            const day  = headers[i];
            const name = $(td).text().trim();
            if (day && name) schedule[day].push({ title: name, slug: '' });
          });
        });
        if (Object.keys(schedule).length > 0) break;
      }

      // SELECTOR: Block pattern – each day is a '.sched-day' div
      $('.sched-day, .jadwal-day').each((_, block) => {
        const $b  = $(block);
        const day = $b.find('h2, h3, .day-header').first().text().trim().toLowerCase();
        const items = [];
        $b.find('li, .sched-item').each((__, item) => {
          const name = $(item).find('a').text().trim() || $(item).text().trim();
          const href = $(item).find('a').attr('href') || '';
          const slug = extractAnimeSlug(href);
          if (name) items.push({ title: name, slug });
        });
        if (day && items.length) schedule[day] = items;
      });

      if (Object.keys(schedule).length > 0) break;
    }

    return schedule;
  } catch (err) {
    console.error('[neonime] getSchedule error:', err.message);
    return {};
  }
}

/**
 * Get all genres.
 * SELECTOR: Genre taxonomy – '/genres/' page
 * SELECTOR: '.tagcloud a' OR '.genrelist a'
 */
async function getGenres() {
  try {
    const url = `${getBaseUrl()}/genres/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const genres = [];

    // SELECTOR: Genre links
    $('.tagcloud a, .genrelist a, .genre-list a, .genre a').each((_, el) => {
      const $a  = $(el);
      const name = $a.text().trim();
      const href = $a.attr('href') || '';
      const m   = href.match(/\/genres?\/([^/?#]+)\/?/);
      const slug = m ? m[1] : name.toLowerCase().replace(/\s+/g, '-');
      if (name) genres.push({ name, slug });
    });

    return genres;
  } catch (err) {
    console.error('[neonime] getGenres error:', err.message);
    return [];
  }
}

/**
 * Get anime list for a specific genre.
 * URL: /genre/<slug>/page/<page>/
 *
 * SELECTOR: '.animposx article' OR '.listupd article'
 */
async function getGenreAnime(slug, page = 1) {
  try {
    const base = `${getBaseUrl()}/genres/${slug}/`;
    const url  = page > 1 ? `${base}page/${page}/` : base;
    const html = await fetchHtml(url, { referer: base });
    const $ = cheerio.load(html);
    const results = [];

    $('.animposx article, .listupd article, .bs .bsx').each((_, el) => {
      const item = parseCard($, el);
      if (item.title) results.push(item);
    });

    const hasNextPage = $('a.next, .next a, .pagination .next').length > 0;
    return { results, page, hasNextPage };
  } catch (err) {
    console.error('[neonime] getGenreAnime error:', err.message);
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
