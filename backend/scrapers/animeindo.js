'use strict';

/**
 * AnimeIndo / Kuramanime Scraper
 * Ported & adapted from LuckyIndraEfendi/AnimeIndo-RestAPI-V2
 * Base URLs: https://v20.kuramanime.ing, https://kurama.subindo.net
 */

const cheerio = require('cheerio');
const { fetchHtml } = require('../utils/fetcher');
const { sources } = require('../config/sources');

function getBaseUrl() {
  return sources?.animeindo?.baseUrl || sources?.kuramanime?.baseUrl || 'https://v20.kuramanime.ing';
}

function extractSlug(url = '') {
  if (!url) return '';
  const match = url.match(/\/anime\/([^/]+\/[^/?#]+)/);
  if (match) return match[1];
  const match2 = url.match(/\/anime\/([^/?#]+)/);
  if (match2) return match2[1];
  return url.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
}

function cleanText(text = '') {
  return (text || '').replace(/\n/g, '').trim().replace(/"/g, '');
}

/**
 * Get ongoing anime
 */
async function getOngoing(page = 1, orderBy = 'updated') {
  try {
    const url = `${getBaseUrl()}/quick/ongoing?order_by=${orderBy}&page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const animeList = [];

    $('#animeList > div > div').each((_, el) => {
      const typeList = $(el)
        .find('div > ul > a')
        .map((__, a) => $(a).text().trim())
        .get();

      const href = $(el).find('div > a').attr('href') || '';
      const slug = extractSlug(href);
      const title = cleanText($(el).find('div > h5').text());
      const episode = cleanText($(el).find('a > div > div.ep > span').text());
      const poster = $(el).find('a > div').attr('data-setbg') || $(el).find('img').attr('src') || '';

      if (title && slug) {
        animeList.push({
          id: slug,
          title,
          slug,
          poster,
          type: typeList[0] || 'TV',
          status: 'Ongoing',
          episodes: episode || 'Tayang',
          rating: null,
          genres: typeList,
        });
      }
    });

    return animeList;
  } catch (err) {
    console.error('[animeindo] getOngoing error:', err.message);
    return [];
  }
}

/**
 * Get completed anime
 */
async function getComplete(page = 1, orderBy = 'latest') {
  try {
    const url = `${getBaseUrl()}/quick/finished?order_by=${orderBy}&page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const animeList = [];

    $('#animeList > div > div').each((_, el) => {
      const typeList = $(el)
        .find('div > ul > a')
        .map((__, a) => $(a).text().trim())
        .get();

      const href = $(el).find('div > a').attr('href') || '';
      const slug = extractSlug(href);
      const title = cleanText($(el).find('div > h5').text());
      const episode = cleanText($(el).find('a > div > div.ep > span').text());
      const poster = $(el).find('a > div').attr('data-setbg') || $(el).find('img').attr('src') || '';

      if (title && slug) {
        animeList.push({
          id: slug,
          title,
          slug,
          poster,
          type: typeList[0] || 'TV',
          status: 'Completed',
          episodes: episode || 'Selesai',
          rating: null,
          genres: typeList,
        });
      }
    });

    return animeList;
  } catch (err) {
    console.error('[animeindo] getComplete error:', err.message);
    return [];
  }
}

/**
 * Get anime movies
 */
async function getMovies(page = 1, orderBy = 'latest') {
  try {
    const url = `${getBaseUrl()}/quick/movie?order_by=${orderBy}&page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const animeList = [];

    $('#animeList > div > div').each((_, el) => {
      const typeList = $(el)
        .find('div > ul > a')
        .map((__, a) => $(a).text().trim())
        .get();

      const href = $(el).find('div > a').attr('href') || '';
      const slug = extractSlug(href);
      const title = cleanText($(el).find('div > h5').text());
      const episode = cleanText($(el).find('a > div > div.ep > span').text());
      const poster = $(el).find('a > div').attr('data-setbg') || $(el).find('img').attr('src') || '';

      if (title && slug) {
        animeList.push({
          id: slug,
          title,
          slug,
          poster,
          type: 'Movie',
          status: 'Completed',
          episodes: episode || 'Movie',
          rating: null,
          genres: typeList,
        });
      }
    });

    return animeList;
  } catch (err) {
    console.error('[animeindo] getMovies error:', err.message);
    return [];
  }
}

/**
 * Search anime
 */
async function searchAnime(query, page = 1) {
  try {
    const url = `${getBaseUrl()}/anime?search=${encodeURIComponent(query.trim())}&page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results = [];

    $('#animeList > div > div').each((_, el) => {
      const href = $(el).find('div > a').attr('href') || '';
      const slug = extractSlug(href);
      const title = cleanText($(el).find('div > h5').text());
      const episode = cleanText($(el).find('a > div > div.ep > span').text());
      const poster = $(el).find('a > div').attr('data-setbg') || $(el).find('img').attr('src') || '';
      const typeList = $(el).find('div > ul > a').map((__, a) => $(a).text().trim()).get();

      if (title && slug) {
        results.push({
          id: slug,
          title,
          slug,
          poster,
          type: typeList[0] || 'TV',
          status: 'Ongoing',
          episodes: episode || null,
          rating: null,
          genres: typeList,
        });
      }
    });

    return results;
  } catch (err) {
    console.error('[animeindo] searchAnime error:', err.message);
    return [];
  }
}

/**
 * Get anime detail
 */
async function getAnimeDetail(slug) {
  try {
    const cleanSlug = slug.replace(/^anime\//, '');
    const url = `${getBaseUrl()}/anime/${cleanSlug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = cleanText($('div.anime__details__title > h3').text() || $('h3').first().text());
    const poster = $('div.anime__details__pic, .product__item__pic, div[data-setbg]').first().attr('data-setbg') || $('img').first().attr('src') || '';
    const synopsis = cleanText($('#synopsisField').text() || $('.anime__details__text p').text());

    // Extract widgets metadata
    const type = cleanText($('div.anime__details__widget ul li:nth-child(1) a').first().text()) || 'TV';
    const total_eps = cleanText($('div.anime__details__widget ul li:nth-child(2) a').first().text());
    const status = cleanText($('div.anime__details__widget ul li:nth-child(3) a').first().text());
    const studio = cleanText($('div.anime__details__widget div:nth-child(2) ul li:nth-child(5) a').first().text());
    const ratings = cleanText($('div.anime__details__widget div:nth-child(2) ul li:nth-child(6) a').first().text());

    // Genres
    const genres = [];
    $('div.anime__details__widget a[href*="/properties/genre/"], a[href*="/genres/"]').each((_, a) => {
      genres.push($(a).text().trim());
    });

    // Episode list
    const episodeData = $('#episodeLists').attr('data-content') || '';
    let episodes_list = [];

    if (episodeData) {
      const $$ = cheerio.load(episodeData);
      $$('a').each((idx, a) => {
        const epHref = $$(a).attr('href') || '';
        const epTitle = cleanText($$(a).text());
        if (epHref && epTitle) {
          const epSlug = epHref.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
          episodes_list.push({
            id: epSlug,
            title: epTitle,
            slug: epSlug,
            episode_number: String(idx + 1),
          });
        }
      });
    }

    if (episodes_list.length === 0) {
      $('#animeEpisodes > a, a[href*="/episode/"]').each((idx, a) => {
        const epHref = $(a).attr('href') || '';
        const epTitle = cleanText($(a).text().replace('Ep', 'Episode '));
        if (epHref) {
          const epSlug = epHref.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '');
          episodes_list.push({
            id: epSlug,
            title: epTitle || `Episode ${idx + 1}`,
            slug: epSlug,
            episode_number: String(idx + 1),
          });
        }
      });
    }

    return {
      id: slug,
      title,
      slug,
      poster,
      type: type || 'TV',
      status: status || 'Unknown',
      episodes: total_eps,
      rating: ratings,
      studio,
      genres,
      synopsis,
      episodes_list,
    };
  } catch (err) {
    console.error('[animeindo] getAnimeDetail error:', err.message);
    return null;
  }
}

/**
 * Get episode stream
 */
async function getEpisode(slug) {
  try {
    const cleanSlug = slug.startsWith('anime/') ? slug : `anime/${slug}`;
    const url = `${getBaseUrl()}/${cleanSlug}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = cleanText($('#episodeTitle').text() || $('h3').first().text());
    const animeTitle = cleanText(title.replace(/Episode\s*\d+.*/i, ''));

    const servers = [];
    const videoStreams = [];

    // Native source tags
    $('#player > source, video > source').each((_, s) => {
      const src = $(s).attr('src');
      const size = $(s).attr('size') || 'HD';
      if (src) {
        videoStreams.push({
          quality: size.includes('p') ? size : `${size}p`,
          url: src,
        });
      }
    });

    if (videoStreams.length > 0) {
      servers.push({
        server: 'Server AnimeIndo Native HD',
        streams: videoStreams,
      });
    }

    // Embed iframes
    $('iframe[src]').each((idx, ifr) => {
      const src = $(ifr).attr('src');
      if (src && src.startsWith('http')) {
        servers.push({
          server: `Server AnimeIndo Mirror ${idx + 1}`,
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
    console.error('[animeindo] getEpisode error:', err.message);
    return null;
  }
}

/**
 * Get genre list
 */
async function getGenres() {
  try {
    const url = `${getBaseUrl()}/properties/genre?genre_type=all`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const genreList = [];

    $('#animeList > div > div > ul > li a').each((_, a) => {
      const name = cleanText($(a).text());
      const href = $(a).attr('href') || '';
      const slug = href.replace(/^.*\/properties\/genre\//, '').split('?')[0].replace(/\/$/, '').trim();
      if (name && slug) {
        genreList.push({ name, slug });
      }
    });

    return genreList;
  } catch (err) {
    console.error('[animeindo] getGenres error:', err.message);
    return [];
  }
}

/**
 * Get anime by genre
 */
async function getGenreAnime(genreId, page = 1) {
  try {
    const url = `${getBaseUrl()}/properties/genre/${genreId}?page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const list = [];

    $('#animeList > div > div').each((_, el) => {
      const href = $(el).find('div > a').attr('href') || '';
      const slug = extractSlug(href);
      const title = cleanText($(el).find('div > h5').text());
      const poster = $(el).find('a > div').attr('data-setbg') || $(el).find('img').attr('src') || '';
      const typeList = $(el).find('div > ul > a').map((__, a) => $(a).text().trim()).get();

      if (title && slug) {
        list.push({
          id: slug,
          title,
          slug,
          poster,
          type: typeList[0] || 'TV',
          status: 'Unknown',
          episodes: null,
          rating: null,
          genres: typeList,
        });
      }
    });

    return list;
  } catch (err) {
    console.error('[animeindo] getGenreAnime error:', err.message);
    return [];
  }
}

/**
 * Get schedule
 */
async function getSchedule(day = 'monday') {
  try {
    const url = `${getBaseUrl()}/schedule?scheduled_day=${day}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const list = [];

    $('#animeList > div > div').each((_, el) => {
      const href = $(el).find('div > a').attr('href') || '';
      const slug = extractSlug(href);
      const title = cleanText($(el).find('div > h5').text());
      const poster = $(el).find('a > div').attr('data-setbg') || $(el).find('img').attr('src') || '';
      const episode = cleanText($(el).find('a > div > div.ep > span:last-child').text());
      const release_time = cleanText($(el).find('a > div > div.view-end > ul > li:nth-child(2) > span').text());

      if (title && slug) {
        list.push({
          title,
          slug,
          poster,
          episode: episode || 'Tayang',
          time: release_time || '',
        });
      }
    });

    return list;
  } catch (err) {
    console.error('[animeindo] getSchedule error:', err.message);
    return [];
  }
}

module.exports = {
  getOngoing,
  getComplete,
  getMovies,
  searchAnime,
  getAnimeDetail,
  getEpisode,
  getGenres,
  getGenreAnime,
  getSchedule,
};
