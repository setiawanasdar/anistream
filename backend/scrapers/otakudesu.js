'use strict';

/**
 * Otakudesu Scraper (High Quality & Multi-Quality Stream Support)
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

function extractSlug(url = '') {
  if (!url) return '';
  const animeMatch = url.match(/\/anime\/([^/]+)\/?$/);
  if (animeMatch) return animeMatch[1];

  const epMatch = url.match(/\/episode\/([^/]+)\/?$/);
  if (epMatch) {
    return epMatch[1].replace(/-episode-\d+.*$/i, '-sub-indo').replace(/-sub-indo-.*$/i, '-sub-indo');
  }

  const clean = url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
  return clean.split('/').pop() || url;
}

function extractEpisodeSlug(url = '') {
  if (!url) return '';
  const match = url.match(/\/episode\/([^/]+)\/?$/);
  if (match) return match[1];
  return url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
}

function parseCard($, el) {
  const $el = $(el);

  const linkEl = $el.find('.thumb > a, .thumbz a, a').first();
  const href = linkEl.attr('href') || '';
  const slug = extractSlug(href);

  let title = $el.find('.jdlflm, .thumbz h2, h2.jdlflm, h2').first().text().trim();
  if (!title) {
    title = linkEl.attr('title') || '';
  }

  const imgEl = $el.find('.thumbz img, .thumb img, img').first();
  const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

  const episode = $el.find('.epz, .epztipe').first().text().trim();
  const type = $el.find('.epztipe').text().trim() || 'TV';

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
 * Get full anime detail page with resilient fallback URLs.
 */
async function getAnimeDetail(slug) {
  try {
    const cleanSlug = slug.replace(/^https?:\/\/[^/]+\/anime\//, '').replace(/\/$/, '');
    const tryUrls = [
      `${getBaseUrl()}/anime/${cleanSlug}/`,
      `${getBaseUrl()}/anime/${cleanSlug.replace(/-sub-indo$/i, '')}-sub-indo/`,
      `${getBaseUrl()}/anime/${cleanSlug.replace(/-sub-indo$/i, '')}/`,
    ];

    let html = '';
    for (const url of tryUrls) {
      try {
        html = await fetchHtml(url, { referer: getBaseUrl() });
        if (html && (html.includes('infozin') || html.includes('fotoanime') || html.includes('episodelist'))) {
          break;
        }
      } catch {
        // try next
      }
    }

    if (!html) {
      throw new Error(`Failed to fetch anime detail for slug: ${slug}`);
    }

    const $ = cheerio.load(html);

    // Parse info block
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

    // Title
    let title =
      info['judul'] ||
      info['title'] ||
      $('.jdlsub').text().trim() ||
      $('.fotoanime h1.jdlflm').text().trim() ||
      $('.entry-title').text().trim() ||
      '';

    if (!title || title.toLowerCase().includes('otakudesu')) {
      title = cleanSlug
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

    // Episode list: parse from all episode wrappers
    const episodeList = [];
    const seenEp = new Set();

    $('.episodelist ul li, #_epslist ul li, .venser .episodelist ul li, .episodelist li').each((idx, el) => {
      const $el = $(el);
      const a = $el.find('a');
      const epTitle = a.text().trim();
      const epHref = a.attr('href') || '';
      const epSlug = extractEpisodeSlug(epHref);
      const epDate = $el.find('.zeebr').text().trim();

      if (epTitle && epSlug && epHref.includes('/episode/') && !seenEp.has(epSlug)) {
        seenEp.add(epSlug);
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

    return {
      id: cleanSlug,
      title,
      alt_title: altTitle,
      slug: cleanSlug,
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
      episodes_list: episodeList,
      batchLinks,
    };
  } catch (err) {
    console.error('[otakudesu] getAnimeDetail error:', err.message);
    return null;
  }
}

/**
 * Helper to decode mirror data-content payload or extract stream URL.
 */
function decodeStreamPayload(raw) {
  if (!raw) return '';
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    // Check if JSON
    if (decoded.startsWith('{') && decoded.endsWith('}')) {
      const parsed = JSON.parse(decoded);
      return parsed.url || parsed.src || parsed.link || '';
    }
    // Check if HTML containing iframe
    const $ = cheerio.load(decoded);
    const iframeSrc = $('iframe').attr('src');
    if (iframeSrc) return iframeSrc;
    if (decoded.startsWith('http')) return decoded.trim();
  } catch {
    if (raw.startsWith('http')) return raw;
  }
  return '';
}

/**
 * Get episode streaming data with Multi-Quality support (360p, 480p, 720p, 1080p).
 */
async function getEpisode(slug) {
  try {
    const cleanSlug = slug.replace(/^https?:\/\/[^/]+\/episode\//, '').replace(/\/$/, '');
    const url = `${getBaseUrl()}/episode/${cleanSlug}/`;
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
      title = cleanSlug
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

    // ---------------------------------------------------------------------------
    // Multi-Quality & Multi-Server Stream Extraction
    // ---------------------------------------------------------------------------
    const serverMap = new Map(); // serverName -> Map(quality -> url)

    const addStream = (serverName, quality, streamUrl) => {
      if (!serverName || !streamUrl || !streamUrl.startsWith('http')) return;
      if (!serverMap.has(serverName)) {
        serverMap.set(serverName, new Map());
      }
      const qMap = serverMap.get(serverName);
      // Clean quality string (e.g. 'm720p' -> '720p', 'mp4 1080p' -> '1080p')
      let q = quality.toUpperCase().replace(/^M/, '').trim();
      if (q.includes('1080')) q = '1080p';
      else if (q.includes('720')) q = '720p';
      else if (q.includes('480')) q = '480p';
      else if (q.includes('360')) q = '360p';
      else if (!q || q === 'DEFAULT') q = 'HD';

      qMap.set(q, streamUrl);
    };

    // 1. Direct Embed / Iframe on the page (Default Player)
    $('#embed_holder iframe, .responsive-embed-stream iframe, div#embed-player iframe, iframe[src]').each((idx, el) => {
      const src = $(el).attr('src') || '';
      if (src && !src.includes('googleads') && !src.includes('doubleclick')) {
        addStream('Player Utama', 'HD', src);
      }
    });

    // 2. Mirrorstream by Quality (.m360p, .m480p, .m720p, .m1080p)
    $('.mirrorstream ul').each((_, ul) => {
      const $ul = $(ul);
      const ulClass = $ul.attr('class') || '';
      // Quality from ul class e.g. "m360p", "m720p", "m1080p"
      let qualityMatch = ulClass.match(/m(\d+p?)/i);
      let quality = qualityMatch ? qualityMatch[1] : 'HD';

      $ul.find('li').each((_, li) => {
        const $li = $(li);
        const serverName = $li.find('a, span, button').first().text().trim() || 'Mirror';
        const raw = $li.find('a, span, button').first().attr('data-content') || '';
        const streamUrl = decodeStreamPayload(raw);
        if (streamUrl) {
          addStream(serverName, quality, streamUrl);
        }
      });
    });

    // 3. Download Section (.download ul li, .listdownload ul li)
    // Extract per-host multi-quality stream links
    const downloads = [];
    $('.download ul li, .listdownload ul li').each((_, el) => {
      const $el = $(el);
      const qualityText = $el.find('strong, b').text().trim() || 'HD';
      const links = [];

      $el.find('a').each((__, a) => {
        const host = $(a).text().trim();
        const href = $(a).attr('href') || '';
        if (href && host) {
          links.push({ host, url: href });
          // Add as streamable player if host supports embedding
          addStream(host, qualityText, href);
        }
      });

      if (links.length > 0) {
        downloads.push({ quality: qualityText, links });
      }
    });

    // Convert serverMap to structured servers array
    const servers = [];
    for (const [serverName, qMap] of serverMap.entries()) {
      const streams = [];
      // Sort qualities high to low
      const order = ['1080p', '720p', '480p', '360p', 'HD'];
      for (const q of order) {
        if (qMap.has(q)) {
          streams.push({ quality: q, url: qMap.get(q) });
        }
      }
      // Add any remaining qualities
      for (const [q, url] of qMap.entries()) {
        if (!order.includes(q)) {
          streams.push({ quality: q, url });
        }
      }

      if (streams.length > 0) {
        servers.push({
          server: serverName,
          streams,
        });
      }
    }

    return {
      title,
      slug: cleanSlug,
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
 * Get weekly release schedule (Properly parsed by Day block).
 */
async function getSchedule() {
  try {
    const url = `${getBaseUrl()}/jadwal-rilis/`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const dayNameMap = {
      senin: 'Senin',
      selasa: 'Selasa',
      rabu: 'Rabu',
      kamis: 'Kamis',
      jumat: 'Jumat',
      "jum'at": 'Jumat',
      sabtu: 'Sabtu',
      minggu: 'Minggu',
      random: 'Random',
    };

    const schedule = [];
    const validDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    // Method 1: Target .kg-items / .kgjdwl items
    $('.kg-items, .kgjdwl .kg-items, .schedule-item').each((_, block) => {
      const $b = $(block);
      const rawDay = $b.find('h2, .kgtitle').first().text().trim().toLowerCase();
      const day = dayNameMap[rawDay] || rawDay;

      const animes = [];
      $b.find('ul li a, li a').each((__, a) => {
        const title = $(a).text().trim();
        const href = $(a).attr('href') || '';
        const slug = extractSlug(href);
        if (title && slug) {
          animes.push({ title, slug, episode: 'Tayang', time: '', poster: '' });
        }
      });

      if (day && animes.length > 0) {
        schedule.push({ day, animes });
      }
    });

    // Method 2: Fallback - look for h2 headers followed by ul in .venser / .venutama
    if (schedule.length === 0) {
      $('.venser h2, .venutama h2, #venkonten h2').each((_, h2) => {
        const rawDay = $(h2).text().trim().toLowerCase();
        const matchedDay = Object.keys(dayNameMap).find((k) => rawDay.includes(k));
        if (matchedDay) {
          const day = dayNameMap[matchedDay];
          const $ul = $(h2).next('ul');
          const animes = [];

          $ul.find('li a').each((__, a) => {
            const title = $(a).text().trim();
            const href = $(a).attr('href') || '';
            const slug = extractSlug(href);
            if (title && slug) {
              animes.push({ title, slug, episode: 'Tayang', time: '', poster: '' });
            }
          });

          if (animes.length > 0) {
            schedule.push({ day, animes });
          }
        }
      });
    }

    // Method 3: Fallback from ongoing anime if schedule page has different markup
    if (schedule.length === 0) {
      const ongoing = await getOngoing();
      const grouped = {};
      validDays.forEach((d) => (grouped[d] = []));

      ongoing.forEach((anime) => {
        const day = anime.episodes?.includes('Hari') ? 'Senin' : 'Senin';
        grouped[day].push({
          title: anime.title,
          slug: anime.slug,
          episode: anime.episodes || 'Tayang',
          time: '',
          poster: anime.poster,
        });
      });

      for (const [day, animes] of Object.entries(grouped)) {
        if (animes.length > 0) schedule.push({ day, animes });
      }
    }

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
