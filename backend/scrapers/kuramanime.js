'use strict';

/**
 * Kuramanime Scraper (Inspired by wajik-anime-api)
 * Base domain: https://kuramanime.ing
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { sources } = require('../config/sources');

function getBaseUrl() {
  return sources?.kuramanime?.baseUrl || 'https://kuramanime.ing';
}

function extractSlug(url = '') {
  if (!url) return '';
  const match = url.match(/\/anime\/(\d+\/[^/]+)/);
  if (match) return match[1];
  const clean = url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
  return clean;
}

function cleanTitle(raw = '') {
  return raw
    .replace(/^(TV|Movie|Special|OVA|ONA|CM)(BD|HD|WEB-DL)?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getOngoing(page = 1) {
  try {
    const url = `${getBaseUrl()}/quick/ongoing?page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('.product__item').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('h5 a, .product__item__text a').first();
      const rawTitle = linkEl.text().trim();
      const href = linkEl.attr('href') || '';
      const slug = extractSlug(href);

      const imgEl = $el.find('.product__item__pic, img').first();
      const poster = imgEl.attr('data-setbg') || imgEl.attr('src') || '';

      const epBadge = $el.find('.ep span, .ep').first().text().trim();
      const typeBadge = $el.find('.type').first().text().trim() || 'TV';

      if (rawTitle && slug) {
        results.push({
          id: slug,
          title: cleanTitle(rawTitle),
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

    $('.product__item').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('h5 a, .product__item__text a').first();
      const rawTitle = linkEl.text().trim();
      const href = linkEl.attr('href') || '';
      const slug = extractSlug(href);

      const imgEl = $el.find('.product__item__pic, img').first();
      const poster = imgEl.attr('data-setbg') || imgEl.attr('src') || '';

      if (rawTitle && slug) {
        results.push({
          id: slug,
          title: cleanTitle(rawTitle),
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

    $('.product__item, .product__sidebar__comment__item').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('h5 a, .product__item__text a, a').first();
      const rawTitle = linkEl.text().trim();
      const href = linkEl.attr('href') || '';
      const slug = extractSlug(href);

      const imgEl = $el.find('.product__item__pic, img').first();
      const poster = imgEl.attr('data-setbg') || imgEl.attr('src') || '';

      const rating = $el.find('.view, .rating').text().trim();

      if (rawTitle && slug && !slug.includes('/episode/')) {
        results.push({
          id: slug,
          title: cleanTitle(rawTitle),
          slug,
          poster,
          type: 'TV',
          status: 'Unknown',
          episodes: null,
          rating: rating || null,
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

async function getAnimeDetail(slug) {
  try {
    const url = `${getBaseUrl()}/anime/${slug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = cleanTitle($('.anime__details__title h3, h3').first().text().trim());
    const japanese = $('.anime__details__title span').first().text().trim();

    const imgEl = $('.anime__details__pic, .product__item__pic').first();
    const poster = imgEl.attr('data-setbg') || imgEl.find('img').attr('src') || '';

    const synopsis = $('.anime__details__text p').text().trim();

    const genres = [];
    $('.anime__details__widget ul li a[href*="/genres/"]').each((_, a) => {
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
    throw err;
  }
}

async function getEpisode(slug) {
  try {
    const url = `${getBaseUrl()}/${slug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('h3.text-white, .anime__details__title h3, h3').first().text().trim();
    const animeTitle = cleanTitle(title.replace(/Episode\s*\d+.*/i, ''));

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
