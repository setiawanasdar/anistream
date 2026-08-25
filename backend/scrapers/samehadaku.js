'use strict';

/**
 * Samehadaku Scraper
 * Base domain: https://samehadaku.email (configurable via SAMEHADAKU_URL env var)
 *
 * Samehadaku uses a WordPress-based theme similar to other Indonesian anime sites.
 * All selectors are annotated for easy updating.
 *
 * SELECTOR key for quick searching: look for "// SELECTOR:" comments.
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { sources } = require('../config/sources');

function getBaseUrl() {
  return sources.samehadaku.baseUrl;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAnimeSlug(url = '') {
  // https://samehadaku.email/anime/naruto/ -> 'naruto'
  const m = url.match(/\/anime\/([^/?#]+)\/?(?:\?|#|$)/);
  return m ? m[1] : '';
}

function extractEpisodeSlug(url = '') {
  // Strip trailing slashes and get last path segment
  const clean = url.replace(/\/$/, '');
  const parts  = clean.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Parse a standard Samehadaku anime card.
 *
 * SELECTOR: Card wrapper    – 'article.bs' or '.bsx'
 * SELECTOR: Title           – '.tt h2' OR 'h2.title' inside card
 * SELECTOR: Poster          – 'img.wp-post-image' OR '.limit img'
 * SELECTOR: Episode badge   – '.epx' OR '.ep'
 * SELECTOR: Type badge      – '.typez' OR '.sb'
 * SELECTOR: Link            – 'a' wrapping the card
 */
function parseCard($, el) {
  const $el = $(el);

  // SELECTOR: Title
  const title = $el.find('.tt h2').text().trim()
    || $el.find('h2.title').text().trim()
    || $el.find('h2').first().text().trim();

  // SELECTOR: Card link
  const href = $el.find('a').first().attr('href') || '';
  const slug = extractAnimeSlug(href);

  // SELECTOR: Poster (lazy-loaded images use data-src)
  const imgEl = $el.find('img.wp-post-image, .limit img, img').first();
  const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

  // SELECTOR: Episode badge
  const episode = $el.find('.epx, .ep').text().trim();

  // SELECTOR: Type badge
  const type = $el.find('.typez, .sb').text().trim() || 'TV';

  return {
    id: slug,
    title,
    slug,
    poster,
    type,
    status: null,
    episodes: episode || null,
    rating: null,
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
 * Page: /ongoing-anime/ OR /anime-ongoing/
 *
 * SELECTOR: '.listupd article.bs' OR '.listupd .bsx'
 */
async function getOngoing() {
  try {
    // Try primary ongoing URL then fallback URL
    const urls = [
      `${getBaseUrl()}/ongoing-anime/`,
      `${getBaseUrl()}/anime-ongoing/`,
      `${getBaseUrl()}/`,
    ];

    for (const url of urls) {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const results = [];

      // SELECTOR: Card list
      $('.listupd article.bs, .listupd .bsx').each((_, el) => {
        const item = parseCard($, el);
        if (item.title) results.push({ ...item, status: 'Ongoing' });
      });

      if (results.length > 0) return results;
    }
    return [];
  } catch (err) {
    console.error('[samehadaku] getOngoing error:', err.message);
    return [];
  }
}

/**
 * Get completed anime.
 * Page: /complete-anime/ OR /anime-tamat/
 *
 * SELECTOR: Same card structure as ongoing
 */
async function getComplete() {
  try {
    const urls = [
      `${getBaseUrl()}/complete-anime/`,
      `${getBaseUrl()}/anime-tamat/`,
    ];

    for (const url of urls) {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const results = [];

      $('.listupd article.bs, .listupd .bsx').each((_, el) => {
        const item = parseCard($, el);
        if (item.title) results.push({ ...item, status: 'Completed' });
      });

      if (results.length > 0) return results;
    }
    return [];
  } catch (err) {
    console.error('[samehadaku] getComplete error:', err.message);
    return [];
  }
}

/**
 * Get popular anime.
 * Page: homepage popular section or /popular-anime/
 *
 * SELECTOR: '.widget_popularpost ul li' OR '.popular-posts ul li'
 * Fallback: homepage card grid
 */
async function getPopular() {
  try {
    const url = `${getBaseUrl()}/popular-anime/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.listupd article.bs, .listupd .bsx').each((_, el) => {
      const item = parseCard($, el);
      if (item.title) results.push(item);
    });

    return results;
  } catch (err) {
    console.error('[samehadaku] getPopular error:', err.message);
    return [];
  }
}

/**
 * Search anime.
 * URL: /?s=<query>
 *
 * SELECTOR: '.listupd article.bs' (same card structure)
 */
async function searchAnime(query) {
  try {
    const url = `${getBaseUrl()}/?s=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.listupd article.bs, .listupd .bsx, .search-result article').each((_, el) => {
      const item = parseCard($, el);
      if (item.title) results.push(item);
    });

    return results;
  } catch (err) {
    console.error('[samehadaku] searchAnime error:', err.message);
    return [];
  }
}

/**
 * Get anime detail page.
 * URL: /anime/<slug>/
 *
 * SELECTOR: Title      – '.infox h1' OR 'h1.entry-title'
 * SELECTOR: Poster     – '.thumb img'
 * SELECTOR: Info rows  – '.sinfo li' (each <li> has label + value)
 * SELECTOR: Synopsis   – '.entry-content p' OR '.sinopsis p'
 * SELECTOR: Genre tags – '.genxed a' OR '.sinfo .genre a'
 * SELECTOR: Episode list – '#eplist li a'
 *   SELECTOR: Ep number badge – '#eplist li .epl-num'
 *   SELECTOR: Ep title        – '#eplist li .epl-title'
 *   SELECTOR: Ep date         – '#eplist li .epl-date'
 */
async function getAnimeDetail(slug) {
  try {
    const url = `${getBaseUrl()}/anime/${slug}/`;
    const html = await fetchHtml(url, { referer: getBaseUrl() });
    const $ = cheerio.load(html);

    // SELECTOR: Title
    const title = $('.infox h1').text().trim()
      || $('h1.entry-title').text().trim()
      || $('h1').first().text().trim();

    // SELECTOR: Poster
    const poster = $('.thumb img').attr('data-src')
      || $('.thumb img').attr('src')
      || '';

    // SELECTOR: Synopsis
    const synopsis = $('.entry-content p').first().text().trim()
      || $('.sinopsis p').text().trim()
      || '';

    // SELECTOR: Info rows
    const info = {};
    $('.sinfo li').each((_, el) => {
      const $el  = $(el);
      const label = $el.find('b, strong').text().replace(':', '').trim().toLowerCase();
      // Remove the label element text from the full text to get the value
      $el.find('b, strong').remove();
      const value = $el.text().replace(':', '').trim();
      if (label) info[label] = value;
    });

    // SELECTOR: Genres
    const genres = [];
    $('.genxed a, .sinfo .genre a').each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });
    // Fallback from info object
    if (genres.length === 0 && info['genre']) {
      info['genre'].split(',').forEach((g) => { const t = g.trim(); if (t) genres.push(t); });
    }

    const rating   = info['skor'] || info['score'] || info['rating'] || null;
    const type     = info['type'] || info['tipe'] || null;
    const status   = info['status'] || null;
    const episodes = info['episodes'] || info['episode'] || info['total episode'] || null;
    const studio   = info['studio'] || null;
    const year     = info['released'] || info['aired'] || info['tanggal rilis'] || null;

    // SELECTOR: Episode list
    const episodeList = [];
    $('#eplist li').each((_, el) => {
      const $el  = $(el);
      const a    = $el.find('a');
      const href = a.attr('href') || '';
      const epSlug = extractEpisodeSlug(href);

      // SELECTOR: Episode number, title, date
      const epNum   = $el.find('.epl-num').text().trim();
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
    console.error('[samehadaku] getAnimeDetail error:', err.message);
    return null;
  }
}

/**
 * Get episode streaming data.
 * URL: /<episode-slug>/  (Samehadaku episode URLs don't have /episode/ prefix)
 *
 * SELECTOR: Server/mirror list – '.mirror .mirrorops button[data-content]'
 *   data-content = base64 encoded iframe HTML
 *
 * SELECTOR: Fallback iframe – '.player-embed iframe, #player iframe'
 * SELECTOR: Download links  – '.download-eps a' OR '.download-item a'
 *
 * SELECTOR: Episode navigation
 *   Prev: '.episodelist .naveps .navi-prev a'
 *   Next: '.episodelist .naveps .navi-next a'
 */
async function getEpisode(slug) {
  try {
    // Samehadaku uses direct slug (no /episode/ prefix for older posts)
    const url = `${getBaseUrl()}/${slug}/`;
    const html = await fetchHtml(url, { referer: getBaseUrl() });
    const $ = cheerio.load(html);

    // SELECTOR: Episode title
    const title = $('h1.entry-title').text().trim() || $('h1').first().text().trim();

    // SELECTOR: Anime back-link
    const animeHref = $('.cat-series a').first().attr('href') || '';
    const animeSlug = extractAnimeSlug(animeHref);

    // SELECTOR: Navigation
    const prevHref = '.navi-prev a, .prev a';
    const nextHref = '.navi-next a, .next a';
    const prevSlug = extractEpisodeSlug($(prevHref).first().attr('href') || '');
    const nextSlug = extractEpisodeSlug($(nextHref).first().attr('href') || '');

    // SELECTOR: Server buttons
    const servers = [];
    // SELECTOR: '.mirror .mirrorops button' with data-content attribute
    $('.mirror .mirrorops button[data-content]').each((_, el) => {
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

    // SELECTOR: Fallback – direct embed
    if (servers.length === 0) {
      $('.player-embed iframe, #player iframe, .bixbox iframe').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (src) servers.push({ label: 'Embed', embedUrl: src });
      });
    }

    // SELECTOR: Download links
    const downloads = [];
    // SELECTOR: '.download-eps table tbody tr' – quality in first cell, links in rest
    $('.download-eps table tbody tr, .download-item').each((_, el) => {
      const $el     = $(el);
      const quality = $el.find('td').first().text().trim()
        || $el.find('strong').text().trim();
      const links   = [];
      $el.find('a').each((__, a) => {
        const href = $(a).attr('href') || '';
        if (href) links.push({ host: $(a).text().trim(), url: href });
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
    console.error('[samehadaku] getEpisode error:', err.message);
    return null;
  }
}

/**
 * Get weekly schedule.
 * URL: /jadwal-tayang/
 *
 * SELECTOR: Day block   – '.schedule-day' OR '.jadwal table'
 * SELECTOR: Day heading – '.schedule-day h2' OR table column header
 * SELECTOR: Anime item  – '.schedule-day li a' OR table cell content
 */
async function getSchedule() {
  try {
    const url = `${getBaseUrl()}/jadwal-tayang/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const schedule = {};

    // SELECTOR: Column-based schedule table
    const headers = [];
    $('table thead th, table thead td').each((_, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });

    if (headers.length > 0) {
      headers.forEach((h) => { schedule[h] = []; });
      $('table tbody tr').each((_, tr) => {
        $(tr).find('td').each((colIdx, td) => {
          const day  = headers[colIdx];
          const $td  = $(td);
          const name = $td.find('a').text().trim() || $td.text().trim();
          const href = $td.find('a').attr('href') || '';
          const slug = extractAnimeSlug(href);
          if (day && name) {
            if (!schedule[day]) schedule[day] = [];
            schedule[day].push({ title: name, slug });
          }
        });
      });
    }

    // SELECTOR: Block-based schedule (fallback)
    if (Object.keys(schedule).length === 0) {
      $('.schedule-day').each((_, block) => {
        const $block = $(block);
        const day    = $block.find('h2, h3').first().text().trim().toLowerCase();
        const items  = [];
        $block.find('li a, ul li').each((__, el) => {
          const name = $(el).find('a').text().trim() || $(el).text().trim();
          const href = $(el).find('a').attr('href') || '';
          const slug = extractAnimeSlug(href);
          if (name) items.push({ title: name, slug });
        });
        if (day && items.length) schedule[day] = items;
      });
    }

    return schedule;
  } catch (err) {
    console.error('[samehadaku] getSchedule error:', err.message);
    return {};
  }
}

/**
 * Get all genres.
 * SELECTOR: Genre taxonomy page – '/genres/' or sidebar widget
 * SELECTOR: '.genrelist a' OR sidebar '.widget .tagcloud a'
 */
async function getGenres() {
  try {
    const url = `${getBaseUrl()}/genres/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const genres = [];

    // SELECTOR: Genre links
    $('.genrelist a, .tagcloud a, .genre-list a').each((_, el) => {
      const $a  = $(el);
      const name = $a.text().trim();
      const href = $a.attr('href') || '';
      const m   = href.match(/\/genres?\/([^/?#]+)\/?/);
      const slug = m ? m[1] : name.toLowerCase().replace(/\s+/g, '-');
      if (name) genres.push({ name, slug });
    });

    return genres;
  } catch (err) {
    console.error('[samehadaku] getGenres error:', err.message);
    return [];
  }
}

/**
 * Get anime list for a specific genre.
 * URL: /genres/<slug>/page/<page>/
 *
 * SELECTOR: Same card structure – '.listupd article.bs'
 */
async function getGenreAnime(slug, page = 1) {
  try {
    const base = `${getBaseUrl()}/genres/${slug}/`;
    const url  = page > 1 ? `${base}page/${page}/` : base;
    const html = await fetchHtml(url, { referer: base });
    const $ = cheerio.load(html);
    const results = [];

    $('.listupd article.bs, .listupd .bsx').each((_, el) => {
      const item = parseCard($, el);
      if (item.title) results.push(item);
    });

    const hasNextPage = $('a.next, .next a, .pagination .next').length > 0;
    return { results, page, hasNextPage };
  } catch (err) {
    console.error('[samehadaku] getGenreAnime error:', err.message);
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
