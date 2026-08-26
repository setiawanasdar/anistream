'use strict';

/**
 * Oploverz Scraper (Inspired by wajik-anime-api)
 * Base domain: https://oploverz.am
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { sources } = require('../config/sources');

function getBaseUrl() {
  return sources?.oploverz?.baseUrl || 'https://oploverz.am';
}

function extractSlug(url = '') {
  if (!url) return '';
  const match = url.match(/\/anime\/([^/]+)/);
  if (match) return match[1];
  return url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
}

async function getOngoing() {
  try {
    const url = `${getBaseUrl()}/anime/?status=ongoing&order=update`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.listupd .bsx, .animposx').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a').first();
      const title = $el.find('.tt h2, h2, .title').text().trim();
      const href = linkEl.attr('href') || '';
      const slug = extractSlug(href);

      const imgEl = $el.find('img').first();
      const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

      const epBadge = $el.find('.bt .ep, .epx, .egg').text().trim();
      const typeBadge = $el.find('.typez').text().trim() || 'TV';

      if (title && slug) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: typeBadge,
          status: 'Ongoing',
          episodes: epBadge || null,
          rating: null,
          genres: [],
        });
      }
    });

    const seen = new Set();
    return results.filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  } catch (err) {
    console.error('[oploverz] getOngoing error:', err.message);
    return [];
  }
}

async function getComplete() {
  try {
    const url = `${getBaseUrl()}/anime/?status=completed&order=update`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.listupd .bsx, .animposx').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a').first();
      const title = $el.find('.tt h2, h2, .title').text().trim();
      const href = linkEl.attr('href') || '';
      const slug = extractSlug(href);

      const imgEl = $el.find('img').first();
      const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

      if (title && slug) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: 'TV',
          status: 'Completed',
          episodes: null,
          rating: null,
          genres: [],
        });
      }
    });

    const seen = new Set();
    return results.filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  } catch (err) {
    console.error('[oploverz] getComplete error:', err.message);
    return [];
  }
}

async function searchAnime(query) {
  try {
    const url = `${getBaseUrl()}/?s=${encodeURIComponent(query.trim())}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.listupd article, .bsx, .animposx').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a').first();
      const title = $el.find('.tt h2, h2, .title').text().trim();
      const href = linkEl.attr('href') || '';
      const slug = extractSlug(href);

      const imgEl = $el.find('img').first();
      const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

      if (title && slug) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: 'TV',
          status: 'Unknown',
          episodes: null,
          rating: null,
          genres: [],
        });
      }
    });

    const seen = new Set();
    return results.filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  } catch (err) {
    console.error('[oploverz] searchAnime error:', err.message);
    return [];
  }
}

async function getAnimeDetail(slug) {
  try {
    const url = `${getBaseUrl()}/anime/${slug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('.entry-title, h1.entry-title').first().text().trim();
    const poster = $('.infox img, .thumb img').attr('data-src') || $('.infox img, .thumb img').attr('src') || '';
    const synopsis = $('.entry-content p, .sinopsis p, .mindesc').text().trim();

    const episodes_list = [];
    $('.eplister ul li a, .episodelist ul li a').each((_, a) => {
      const epHref = $(a).attr('href') || '';
      const epNum = $(a).find('.epl-num').text().trim() || $(a).text().replace(/\D+/g, '') || '1';
      const epSlug = epHref.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');

      episodes_list.push({
        id: epSlug,
        title: `Episode ${epNum}`,
        slug: epSlug,
        episode_number: epNum,
      });
    });

    return {
      id: slug,
      title,
      slug,
      poster,
      type: 'TV',
      status: 'Unknown',
      episodes_list,
      total_episodes: episodes_list.length > 0 ? String(episodes_list.length) : null,
      genres: [],
      synopsis,
    };
  } catch (err) {
    console.error('[oploverz] getAnimeDetail error:', err.message);
    throw err;
  }
}

async function getEpisode(slug) {
  try {
    const cleanSlug = slug.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
    const numMatch = cleanSlug.match(/episode-(\d+)/i);
    const epNum = numMatch ? numMatch[1] : '1';
    const epInt = parseInt(epNum, 10) || 1;
    const baseAnime = cleanSlug.replace(/-episode-\d+.*/i, '');

    const trySlugs = [
      `${baseAnime}-episode-${String(epInt).padStart(3, '0')}`,
      `${baseAnime}-episode-${String(epInt).padStart(2, '0')}`,
      cleanSlug,
      `${baseAnime}-episode-${epInt}-sub-indo`,
      `${baseAnime}-episode-${epInt}`,
      `${baseAnime}-0-episode-${String(epInt).padStart(2, '0')}`,
    ];

    const uniqueSlugs = [...new Set(trySlugs)];
    let html = '';
    let foundSlug = cleanSlug;

    for (const s of uniqueSlugs) {
      try {
        const url = `${getBaseUrl()}/${s}`;
        const res = await fetchHtml(url);
        if (res && (res.includes('entry-title') || res.includes('iframe'))) {
          const $ = cheerio.load(res);
          const pageTitle = $('h1.entry-title').text().trim();
          const epMatchInTitle = pageTitle.match(/episode\s*(\d+)/i);
          // Skip if WordPress redirected to a different episode number (e.g. 1 -> 100)
          if (epMatchInTitle && parseInt(epMatchInTitle[1], 10) !== epInt) {
            continue;
          }
          html = res;
          foundSlug = s;
          break;
        }
      } catch {
        // try next variant
      }
    }

    if (!html) {
      throw new Error(`Episode page not found on Oploverz for: ${slug}`);
    }

    const $ = cheerio.load(html);
    const title = $('h1.entry-title').text().trim() || `${cleanSlug.replace(/-/g, ' ')}`;
    const servers = [];

    $('iframe[src]').each((_, ifr) => {
      const src = $(ifr).attr('src');
      if (
        src &&
        src.startsWith('http') &&
        !src.includes('googleads') &&
        !src.includes('doubleclick') &&
        !src.includes('facebook')
      ) {
        const isBlogger = src.includes('blogger.com');
        servers.push({
          server: isBlogger ? 'Sub Indo - Oploverz (360p/480p SD)' : 'Sub Indo - Oploverz HD',
          streams: isBlogger
            ? [
                { quality: '480p', url: src },
                { quality: '360p', url: src },
              ]
            : [
                { quality: '1080p', url: src },
                { quality: '720p', url: src },
                { quality: 'HD', url: src },
              ],
        });
      }
    });

    return {
      title,
      slug: foundSlug,
      anime: title.replace(/Episode\s*\d+.*/i, '').trim(),
      animeSlug: foundSlug.replace(/-episode-\d+.*/, ''),
      servers,
      downloads: [],
    };
  } catch (err) {
    console.error('[oploverz] getEpisode error:', err.message);
    throw err;
  }
}

module.exports = {
  getOngoing,
  getComplete,
  searchAnime,
  getAnimeDetail,
  getEpisode,
};
