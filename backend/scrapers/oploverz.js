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

    $('.listupd article, .bsx, .animposx').each((_, el) => {
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

    return results;
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
          status: 'Completed',
          episodes: null,
          rating: null,
          genres: [],
        });
      }
    });

    return results;
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
    const url = `${getBaseUrl()}/${slug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('h1.entry-title').text().trim();
    const servers = [];
    $('iframe[src]').each((_, ifr) => {
      const src = $(ifr).attr('src');
      if (src && src.startsWith('http')) {
        servers.push({
          server: 'Server Oploverz HD',
          streams: [{ quality: 'HD', url: src }],
        });
      }
    });

    return {
      title,
      slug,
      anime: title.replace(/Episode\s*\d+.*/i, '').trim(),
      animeSlug: slug.replace(/-episode-\d+.*/, ''),
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
