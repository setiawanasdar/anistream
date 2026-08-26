'use strict';

/**
 * Kuramanime Scraper (Integrated from wajik-anime-api)
 * Base domain: https://v20.kuramanime.ing
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { sources } = require('../config/sources');

function getBaseUrl() {
  return sources?.kuramanime?.baseUrl || 'https://v20.kuramanime.ing';
}

function extractSlug(url = '') {
  if (!url) return '';
  const match = url.match(/\/anime\/([^/]+\/[^/?#]+)/);
  if (match) return match[1];
  const match2 = url.match(/\/anime\/([^/?#]+)/);
  if (match2) return match2[1];
  return url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
}

function cleanTitle(raw = '', slug = '') {
  const lines = (raw || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.toLowerCase().includes('loading') && l !== 'SELESAI' && !/^\d+(\.\d+)?$/.test(l));
  const candidate = lines[lines.length - 1] || '';
  if (candidate.length > 2) {
    return candidate
      .replace(/^(TV|Movie|Special|OVA|ONA|CM)(BD|HD|WEB-DL)?/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (slug) {
    const slugPart = slug.includes('/') ? slug.split('/')[1] : slug;
    return slugPart.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return raw || '';
}

async function getOngoing(page = 1) {
  try {
    const url = `${getBaseUrl()}/quick/ongoing?page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('a[href*="/anime/"]').each((_, a) => {
      const $a = $(a);
      const href = $a.attr('href') || '';
      const rawText = $a.text().trim();
      const slug = extractSlug(href);

      const imgEl = $a.find('img, div[data-setbg]').first();
      const poster = imgEl.attr('data-setbg') || imgEl.attr('src') || '';

      const ratingMatch = rawText.match(/(\d+\.\d+)/);
      const rating = ratingMatch ? ratingMatch[1] : null;

      const title = cleanTitle(rawText, slug);

      if (title && slug && !slug.includes('/episode/')) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: 'TV',
          status: 'Ongoing',
          episodes: null,
          rating,
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
    console.error('[kuramanime] getOngoing error:', err.message);
    return [];
  }
}

async function getComplete(page = 1) {
  try {
    const url = `${getBaseUrl()}/quick/finished?page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('a[href*="/anime/"]').each((_, a) => {
      const $a = $(a);
      const href = $a.attr('href') || '';
      const rawText = $a.text().trim();
      const slug = extractSlug(href);

      const imgEl = $a.find('img, div[data-setbg]').first();
      const poster = imgEl.attr('data-setbg') || imgEl.attr('src') || '';

      const ratingMatch = rawText.match(/(\d+\.\d+)/);
      const rating = ratingMatch ? ratingMatch[1] : null;

      const title = cleanTitle(rawText, slug);

      if (title && slug && !slug.includes('/episode/')) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: 'TV',
          status: 'Completed',
          episodes: null,
          rating,
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
    console.error('[kuramanime] getComplete error:', err.message);
    return [];
  }
}

async function searchAnime(query) {
  try {
    const url = `${getBaseUrl()}/anime?search=${encodeURIComponent(query.trim())}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('a[href*="/anime/"]').each((_, a) => {
      const $a = $(a);
      const href = $a.attr('href') || '';
      const rawText = $a.text().trim();
      const slug = extractSlug(href);

      const imgEl = $a.find('img, div[data-setbg]').first();
      const poster = imgEl.attr('data-setbg') || imgEl.attr('src') || '';

      const ratingMatch = rawText.match(/(\d+\.\d+)/);
      const rating = ratingMatch ? ratingMatch[1] : null;

      const isFinished = rawText.includes('SELESAI');
      const status = isFinished ? 'Completed' : 'Ongoing';

      const title = cleanTitle(rawText, slug);

      if (title && slug && !slug.includes('/episode/') && title.length > 1) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: 'TV',
          status,
          episodes: null,
          rating,
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
    console.error('[kuramanime] searchAnime error:', err.message);
    return [];
  }
}

function isKuramanimeSlug(slug = '') {
  return /^\d+\//.test(slug) || /^anime\/\d+\//.test(slug) || /\/episode\/\d+/.test(slug);
}

async function getAnimeDetail(slug) {
  if (!isKuramanimeSlug(slug)) return null;

  try {
    const cleanSlug = slug.replace(/^anime\//, '');
    const url = `${getBaseUrl()}/anime/${cleanSlug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = cleanTitle($('.anime__details__title h3, h3').first().text().trim(), cleanSlug);
    const japanese = $('.anime__details__title span').first().text().trim();

    const imgEl = $('.anime__details__pic, .product__item__pic, img').first();
    const poster = imgEl.attr('data-setbg') || imgEl.attr('src') || '';

    const synopsis = $('.anime__details__text p, .sinopsis p').text().trim();

    const genres = [];
    $('.anime__details__widget ul li a[href*="/genres/"], .anime__details__widget a[href*="/properties/genre/"]').each((_, a) => {
      genres.push($(a).text().trim());
    });

    const episodes_list = [];
    $('#episodeLists a, .episode__list a, a[href*="/episode/"]').each((_, a) => {
      const epHref = $(a).attr('href') || '';
      const epTitle = $(a).text().trim();
      const epNumMatch = epHref.match(/\/episode\/(\d+)/);
      const epNum = epNumMatch ? epNumMatch[1] : epTitle.replace(/\D+/g, '') || '1';

      if (epHref.includes('/episode/')) {
        const epSlug = epHref.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
        episodes_list.push({
          id: epSlug,
          title: `Episode ${epNum}`,
          slug: epSlug,
          episode_number: epNum,
        });
      }
    });

    return {
      id: slug,
      title,
      japanese,
      slug,
      poster,
      type: 'TV',
      status: 'Unknown',
      episodes_list,
      total_episodes: episodes_list.length > 0 ? String(episodes_list.length) : null,
      genres,
      synopsis,
    };
  } catch (err) {
    console.error('[kuramanime] getAnimeDetail error:', err.message);
    return null;
  }
}

async function getEpisode(slug) {
  if (!isKuramanimeSlug(slug)) return null;

  try {
    const cleanSlug = slug.startsWith('anime/') ? slug : `anime/${slug}`;
    const url = `${getBaseUrl()}/${cleanSlug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('h3.text-white, .anime__details__title h3, h3').first().text().trim();
    const animeTitle = cleanTitle(title.replace(/Episode\s*\d+.*/i, ''), cleanSlug);

    const servers = [];
    $('iframe[src]').each((_, ifr) => {
      const src = $(ifr).attr('src');
      if (src && src.startsWith('http')) {
        servers.push({
          server: 'Server Kurama HD',
          streams: [{ quality: 'HD', url: src }],
        });
      }
    });

    return {
      title,
      slug,
      anime: animeTitle,
      animeSlug: slug.replace(/\/episode\/\d+.*/, ''),
      servers,
      downloads: [],
    };
  } catch (err) {
    console.error('[kuramanime] getEpisode error:', err.message);
    return null;
  }
}

module.exports = {
  getOngoing,
  getComplete,
  searchAnime,
  getAnimeDetail,
  getEpisode,
};
