'use strict';

/**
 * Otakudesu Scraper
 * Base domain: https://otakudesu.cloud (configurable via OTAKUDESU_URL env var)
 *
 * All CSS selectors are annotated so they are easy to update when the site
 * changes its markup. Search for "SELECTOR:" in this file to find them all.
 *
 * Standardised output shape for anime items:
 * {
 *   id, title, slug, poster, type, status,
 *   episodes, rating, genres, synopsis, studio, year
 * }
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { sources } = require('../config/sources');

function getBaseUrl() {
  return sources.otakudesu.baseUrl;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the anime slug from a full Otakudesu URL.
 * e.g. https://otakudesu.cloud/anime/naruto-sub-indo/ -> 'naruto-sub-indo'
 */
function extractSlug(url = '') {
  const match = url.match(/\/anime\/([^/]+)\/?$/);
  return match ? match[1] : url;
}

/**
 * Extract an episode slug from a full URL.
 * e.g. https://otakudesu.cloud/episode/naruto-episode-1-sub-indo/ -> 'naruto-episode-1-sub-indo'
 */
function extractEpisodeSlug(url = '') {
  const match = url.match(/\/episode\/([^/]+)\/?$/);
  return match ? match[1] : url;
}

/**
 * Parse an Otakudesu anime card element and return a normalised object.
 * Called for both ongoing and completed list pages.
 *
 * SELECTOR: Anime card container – '.venz ul li .detpost'
 *   title   -> '.jdlflm' (or 'h2.jdlflm')
 *   poster  -> '.thumbz img' (check src / data-src)
 *   episode -> '.epz' (latest episode number)
 *   type    -> '.epztipe' (TV, Movie, OVA, …)
 *   link    -> 'a' href on the card
 */
function parseCard($, el) {
  const $el = $(el);

  // SELECTOR: Title
  const title = $el.find('.jdlflm').text().trim() || $el.find('h2').first().text().trim();

  // SELECTOR: Link – wraps the whole card
  const href = $el.find('a').first().attr('href') || '';
  const slug = extractSlug(href);

  // SELECTOR: Poster image – try data-src first (lazy-load), then src
  const imgEl = $el.find('.thumbz img, img').first();
  const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

  // SELECTOR: Episode badge
  const episode = $el.find('.epz').text().trim();

  // SELECTOR: Type badge (TV/Movie/OVA)
  const type = $el.find('.epztipe').text().trim() || 'TV';

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
 * Get ongoing (airing) anime list.
 * Page: /anime-terbaru/
 *
 * SELECTOR: List wrapper – '.venz ul li' then '.detpost'
 * Alternative fallback wrapper: '.venutama ul li'
 */
async function getOngoing() {
  try {
    const url = `${getBaseUrl()}/anime-terbaru/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    // Primary selector
    $('.venz ul li').each((_, el) => {
      const item = parseCard($, el);
      if (item.title) results.push(item);
    });

    // Fallback selector when primary yields nothing
    if (results.length === 0) {
      $('.venutama ul li').each((_, el) => {
        const item = parseCard($, el);
        if (item.title) results.push(item);
      });
    }

    return results;
  } catch (err) {
    console.error('[otakudesu] getOngoing error:', err.message);
    return [];
  }
}

/**
 * Get completed anime list.
 * Page: /anime-tamat/
 *
 * SELECTOR: Same card structure as ongoing – '.venz ul li .detpost'
 */
async function getComplete() {
  try {
    const url = `${getBaseUrl()}/anime-tamat/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.venz ul li').each((_, el) => {
      const item = parseCard($, el);
      if (item.title) results.push({ ...item, status: 'Completed' });
    });

    if (results.length === 0) {
      $('.venutama ul li').each((_, el) => {
        const item = parseCard($, el);
        if (item.title) results.push({ ...item, status: 'Completed' });
      });
    }

    return results;
  } catch (err) {
    console.error('[otakudesu] getComplete error:', err.message);
    return [];
  }
}

/**
 * Get popular anime.
 * Otakudesu does not have a dedicated popular page; we use the homepage
 * widget or the first page of completed list as a proxy.
 * Page: / (homepage)
 *
 * SELECTOR: Homepage popular widget – '.bixbox.hpage .listupd article'
 * Fallback: first completed page
 */
async function getPopular() {
  try {
    const url = getBaseUrl() + '/';
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    // SELECTOR: Homepage popular/trending section
    // Try multiple known widget selectors
    const selectors = [
      '.bixbox .listupd article',
      '.venz ul li',
      '.venutama ul li',
    ];

    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const item = parseCard($, el);
        if (item.title) results.push(item);
      });
      if (results.length > 0) break;
    }

    return results;
  } catch (err) {
    console.error('[otakudesu] getPopular error:', err.message);
    return [];
  }
}

/**
 * Search anime by keyword.
 * URL: /?s=<query>
 *
 * SELECTOR: Search results – '.chivsrc ul li' then 'h2 a' for title/link
 *   title  -> 'h2 a'
 *   poster -> 'img'
 *   genres -> 'li span:nth(1)' (genre list in result)
 *   status -> 'li span:nth(2)'
 */
async function searchAnime(query) {
  try {
    const url = `${getBaseUrl()}/?s=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    // SELECTOR: Search result list
    $('.chivsrc ul li').each((_, el) => {
      const $el = $(el);

      // SELECTOR: Title and href
      const linkEl = $el.find('h2 a');
      const title = linkEl.text().trim();
      const href = linkEl.attr('href') || '';
      const slug = extractSlug(href);

      // SELECTOR: Poster
      const imgEl = $el.find('img');
      const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

      // SELECTOR: Inline metadata (Genre, Status)
      const spans = $el.find('li span');
      const genreText = spans.eq(1).text().trim(); // e.g. "Action, Adventure"
      const status    = spans.eq(2).text().trim();

      if (title) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: null,
          status,
          episodes: null,
          rating: null,
          genres: genreText ? genreText.split(',').map((g) => g.trim()) : [],
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
 * URL: /anime/<slug>/
 *
 * SELECTOR: Detail info block – '.infozin p'
 *   Each <p> has a <span> label and a <span> value (or plain text after :)
 *   Labels: Judul, Japanese, Skor, Produser, Tipe, Status, Total Episode,
 *           Durasi, Tanggal Rilis, Studio, Genre
 *
 * SELECTOR: Synopsis – '.sinopc p' OR '.sinopc'
 * SELECTOR: Poster   – '.fotoanime img'
 * SELECTOR: Episode list – '.episodelist ul li a' (newest first)
 * SELECTOR: Batch download – '.batchlink ul li a'
 */
async function getAnimeDetail(slug) {
  try {
    const url = `${getBaseUrl()}/anime/${slug}/`;
    const html = await fetchHtml(url, { referer: getBaseUrl() });
    const $ = cheerio.load(html);

    // SELECTOR: Main title
    const title = $('h1.jdlflm').text().trim()
      || $('h1').first().text().trim();

    // SELECTOR: Poster image
    const poster = $('.fotoanime img').attr('data-src')
      || $('.fotoanime img').attr('src')
      || '';

    // SELECTOR: Synopsis
    const synopsis = $('.sinopc p').text().trim()
      || $('.sinopc').text().trim();

    // Parse info block
    const info = {};
    // SELECTOR: Each info row is a <p> inside .infozin
    $('.infozin p').each((_, el) => {
      const text = $(el).text();
      const colon = text.indexOf(':');
      if (colon === -1) return;
      const key   = text.slice(0, colon).trim().toLowerCase();
      const value = text.slice(colon + 1).trim();
      info[key] = value;
    });

    // Map info keys to standard fields
    const rating   = info['skor'] || info['score'] || null;
    const type     = info['tipe'] || info['type'] || null;
    const status   = info['status'] || null;
    const episodes = info['total episode'] || info['episode'] || null;
    const studio   = info['studio'] || null;
    const year     = info['tanggal rilis'] || info['aired'] || null;
    const genreRaw = info['genre'] || info['genres'] || '';
    const genres   = genreRaw
      ? genreRaw.split(',').map((g) => g.trim()).filter(Boolean)
      : [];

    // SELECTOR: Episode list – each <li> has an <a> tag
    const episodeList = [];
    $('.episodelist ul li').each((_, el) => {
      const $el = $(el);
      const a   = $el.find('a');
      const epTitle = a.text().trim();
      const epHref  = a.attr('href') || '';
      const epSlug  = extractEpisodeSlug(epHref);
      const epDate  = $el.find('.zeebr').text().trim();
      if (epTitle) {
        episodeList.push({ title: epTitle, slug: epSlug, date: epDate });
      }
    });

    // SELECTOR: Batch download links (if any)
    const batchLinks = [];
    $('.batchlink ul li a').each((_, el) => {
      const $a = $(el);
      batchLinks.push({ label: $a.text().trim(), url: $a.attr('href') || '' });
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
      batchLinks,
    };
  } catch (err) {
    console.error('[otakudesu] getAnimeDetail error:', err.message);
    return null;
  }
}

/**
 * Get episode streaming data.
 * URL: /episode/<slug>/
 *
 * SELECTOR: Stream server list – 'div.mirrorstream ul.muvid li'
 *   Each <li> contains a button/link (<a> or <span>) with data-content or onclick
 *   The data-content attribute holds a base64-encoded URL in some implementations.
 *
 * SELECTOR: Direct iframe (simple embed) – 'div#embed-player iframe'
 *   or the first 'iframe[src]' on the page.
 *
 * SELECTOR: Download links – '.download ul li' -> each quality group
 *   Inside each group: 'a' tags with href = direct download link
 *
 * SELECTOR: Episode navigation
 *   Prev: '.cukder .tleft a'
 *   Next: '.cukder .tright a'
 *
 * SELECTOR: Anime back-link – '.kategoz a' (to parent anime slug)
 */
async function getEpisode(slug) {
  try {
    const url = `${getBaseUrl()}/episode/${slug}/`;
    const html = await fetchHtml(url, { referer: getBaseUrl() });
    const $ = cheerio.load(html);

    // SELECTOR: Episode title
    const title = $('h1.jdlflm').text().trim()
      || $('h1').first().text().trim();

    // SELECTOR: Parent anime link
    const animeHref = $('.kategoz a').attr('href') || '';
    const animeSlug = extractSlug(animeHref);

    // SELECTOR: Navigation
    const prevHref = $('.cukder .tleft a').attr('href') || '';
    const nextHref = $('.cukder .tright a').attr('href') || '';
    const prevSlug = prevHref ? extractEpisodeSlug(prevHref) : null;
    const nextSlug = nextHref ? extractEpisodeSlug(nextHref) : null;

    // ---------------------------------------------------------------------------
    // Stream servers
    // Each server is rendered as a list item; the actual iframe URL is often
    // loaded via AJAX or encoded in a data attribute.
    // SELECTOR: 'div.mirrorstream ul.muvid li'
    // ---------------------------------------------------------------------------
    const servers = [];
    $('div.mirrorstream ul.muvid li').each((_, el) => {
      const $el    = $(el);
      const label  = $el.find('a, span').first().text().trim() || `Server ${servers.length + 1}`;
      // data-content may be base64 or plain URL
      const raw    = $el.find('a, span').first().attr('data-content') || '';
      // Try to decode base64; if it fails, use raw
      let embedUrl = '';
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf-8');
        // Decoded might be HTML containing an iframe
        const $inner = cheerio.load(decoded);
        embedUrl = $inner('iframe').attr('src') || decoded.trim();
      } catch {
        embedUrl = raw;
      }
      servers.push({ label, embedUrl });
    });

    // SELECTOR: Fallback – look for a direct iframe on the page
    if (servers.length === 0) {
      $('iframe[src]').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (src) servers.push({ label: 'Embed', embedUrl: src });
      });
    }

    // SELECTOR: Look for video URL in inline scripts (some themes embed it)
    // Pattern: jwplayer sources array OR file: "..."
    const scriptContent = $('script').map((_, el) => $(el).html() || '').get().join('\n');
    const fileMatch = scriptContent.match(/["']?file["']?\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
    const videoFile = fileMatch ? fileMatch[1] : null;

    // ---------------------------------------------------------------------------
    // Download links
    // SELECTOR: '.download ul li' for quality groups, then inner 'a' tags
    // ---------------------------------------------------------------------------
    const downloads = [];
    $('.download ul li').each((_, el) => {
      const $el   = $(el);
      // SELECTOR: Quality label (e.g. '360p', '480p', '720p')
      const quality = $el.find('strong').text().trim();
      const links   = [];
      $el.find('a').each((__, a) => {
        links.push({ host: $(a).text().trim(), url: $(a).attr('href') || '' });
      });
      if (quality && links.length) {
        downloads.push({ quality, links });
      }
    });

    return {
      title,
      slug,
      animeSlug,
      prevEpisode: prevSlug,
      nextEpisode: nextSlug,
      servers,
      videoFile,
      downloads,
    };
  } catch (err) {
    console.error('[otakudesu] getEpisode error:', err.message);
    return null;
  }
}

/**
 * Get weekly release schedule.
 * URL: /jadwal-rilis/
 *
 * SELECTOR: Schedule table – '#jadwal-anime table tbody tr'
 *   Each row has a <td> for day and anime title/link.
 *   Alternative: '.venser .venutama' list grouped by day.
 *
 * Returns: { monday: [...], tuesday: [...], ... }
 */
async function getSchedule() {
  try {
    const url = `${getBaseUrl()}/jadwal-rilis/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const schedule = {};
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

    // SELECTOR: Day heading and anime list
    // Pattern 1: Grouped <div> blocks, each starting with an <h2> day name
    // SELECTOR: '.venser .venutama'
    let parsed = false;

    // Try table pattern first
    // SELECTOR: '#jadwal-anime table'
    $('#jadwal-anime table').each((_, table) => {
      // Each column is a day
      const headerCells = [];
      $(table).find('thead th, thead td').each((_, th) => {
        headerCells.push($(th).text().trim().toLowerCase());
      });

      if (headerCells.length > 0) {
        headerCells.forEach((day) => { if (day) schedule[day] = []; });

        // SELECTOR: Table body rows
        $(table).find('tbody tr').each((_, tr) => {
          $(tr).find('td').each((colIdx, td) => {
            const day = headerCells[colIdx];
            if (!day) return;
            const $td = $(td);
            const title = $td.find('a').text().trim() || $td.text().trim();
            const href  = $td.find('a').attr('href') || '';
            const slug  = extractSlug(href);
            if (title) {
              if (!schedule[day]) schedule[day] = [];
              schedule[day].push({ title, slug });
            }
          });
        });
        parsed = true;
      }
    });

    // Fallback pattern: grouped day sections
    if (!parsed || Object.keys(schedule).length === 0) {
      // SELECTOR: '.venser h2' for day headings, followed by 'ul li a' for anime
      $('.venser').each((_, el) => {
        const $el  = $(el);
        const day  = $el.find('h2').text().trim().toLowerCase();
        if (!day) return;
        const items = [];
        $el.find('ul li a').each((__, a) => {
          const title = $(a).text().trim();
          const href  = $(a).attr('href') || '';
          const slug  = extractSlug(href);
          if (title) items.push({ title, slug });
        });
        if (items.length) schedule[day] = items;
      });
    }

    return schedule;
  } catch (err) {
    console.error('[otakudesu] getSchedule error:', err.message);
    return {};
  }
}

/**
 * Get all genres.
 * URL: /genre-list/ OR parsed from main nav
 *
 * SELECTOR: Genre list page – '.genres ul li a' OR nav dropdown
 * SELECTOR: Navigation genre dropdown – '#sidebar-menu .genres ul li a'
 *   OR '.genrelist ul li a'
 */
async function getGenres() {
  try {
    const url = `${getBaseUrl()}/genre-list/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const genres = [];

    // SELECTOR: Genre list items
    $('.genrelist ul li a, .genres ul li a').each((_, el) => {
      const $a = $(el);
      const name = $a.text().trim();
      const href = $a.attr('href') || '';
      // Slug from URL: /genre/action/ -> 'action'
      const slugMatch = href.match(/\/genre\/([^/]+)\/?$/);
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
 * Get anime list for a specific genre with pagination.
 * URL: /genre/<slug>/page/<page>/
 *
 * SELECTOR: Same card structure as homepage – '.venz ul li .detpost'
 * SELECTOR: Pagination – '.pagination .page-numbers a' for next/prev
 */
async function getGenreAnime(slug, page = 1) {
  try {
    const base = `${getBaseUrl()}/genre/${slug}/`;
    const url  = page > 1 ? `${base}page/${page}/` : base;
    const html = await fetchHtml(url, { referer: base });
    const $ = cheerio.load(html);
    const results = [];

    // SELECTOR: Anime cards (same as ongoing/complete pages)
    $('.venz ul li, .venutama ul li').each((_, el) => {
      const item = parseCard($, el);
      if (item.title) results.push(item);
    });

    // SELECTOR: Determine if more pages exist
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
