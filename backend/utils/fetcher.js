'use strict';

const axios = require('axios');

// ---------------------------------------------------------------------------
// User-Agent pool – rotated randomly to avoid simple bot detection
// ---------------------------------------------------------------------------
const USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Build realistic browser-like request headers.
 * @param {string} referer - Optional referer URL
 */
function buildHeaders(referer = '') {
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Connection': 'keep-alive',
  };
  if (referer) {
    headers['Referer'] = referer;
    headers['Sec-Fetch-Site'] = 'same-origin';
  }
  return headers;
}

/**
 * Sleep helper for backoff delays.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random jitter delay between minMs and maxMs to avoid rate-limiting.
 * Call this between sequential scraper requests to the same host.
 * @param {number} minMs - minimum delay (default: 1000ms)
 * @param {number} maxMs - maximum delay (default: 3000ms)
 */
function randomJitter(minMs = 1000, maxMs = 3000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(delay);
}

/**
 * Fetch a URL with retry logic and exponential backoff.
 *
 * @param {string} url           - Target URL
 * @param {object} [options]     - Optional overrides
 * @param {string} [options.referer]  - Referer header value
 * @param {number} [options.timeout]  - Request timeout in ms (default: 10000)
 * @param {number} [options.retries]  - Max retry attempts (default: 3)
 * @param {'get'|'post'} [options.method] - HTTP method (default: 'get')
 * @param {object} [options.data] - POST body data
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function fetchUrl(url, options = {}) {
  const {
    referer = '',
    timeout = 10000,
    retries = 3,
    method = 'get',
    data = null,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        method,
        url,
        data,
        timeout,
        headers: buildHeaders(referer),
        // Follow redirects (default axios behaviour)
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // don't throw on 4xx
      });

      if (response.status === 200) {
        return response;
      }

      // Treat non-200 as a soft failure worth retrying
      throw new Error(`HTTP ${response.status} for ${url}`);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms …
        const delay = 500 * Math.pow(2, attempt - 1);
        console.warn(
          `[fetcher] Attempt ${attempt}/${retries} failed for ${url}: ${err.message} – retrying in ${delay}ms`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Convenience wrapper that returns response.data (the HTML string or JSON).
 */
async function fetchHtml(url, options = {}) {
  const response = await fetchUrl(url, options);
  return response.data;
}

/**
 * Fetch JSON from a URL (e.g. AniList GraphQL responses).
 */
async function fetchJson(url, options = {}) {
  const response = await fetchUrl(url, { ...options, method: options.method || 'get' });
  return response.data;
}

module.exports = { fetchUrl, fetchHtml, fetchJson, buildHeaders, randomJitter };
