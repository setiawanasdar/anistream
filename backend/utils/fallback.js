'use strict';

const { sources } = require('../config/sources');

/**
 * Try each source in order, returning the first successful result.
 *
 * @param {string[]} sourceOrder  - Array of source names, e.g. ['otakudesu', 'samehadaku', 'neonime']
 * @param {string}   methodName   - Name of the scraper function to call, e.g. 'getOngoing'
 * @param {...any}   args         - Arguments forwarded to the scraper function
 * @returns {Promise<{ data: any, source: string }>}
 */
async function withFallback(sourceOrder, methodName, ...args) {
  const errors = [];

  for (const sourceName of sourceOrder) {
    // Skip disabled sources
    const sourceConfig = sources[sourceName];
    if (!sourceConfig || !sourceConfig.enabled) {
      console.info(`[fallback] Source "${sourceName}" is disabled – skipping`);
      continue;
    }

    try {
      // Dynamic require so each scraper is only loaded if needed
      const scraper = require('../scrapers/' + sourceName);

      if (typeof scraper[methodName] !== 'function') {
        console.warn(`[fallback] Source "${sourceName}" does not implement "${methodName}" – skipping`);
        continue;
      }

      const result = await scraper[methodName](...args);

      // Consider the result successful when it has content
      const hasContent = Array.isArray(result)
        ? result.length > 0
        : result !== null && result !== undefined;

      if (hasContent) {
        return { data: result, source: sourceName };
      }

      console.warn(`[fallback] Source "${sourceName}" returned empty result for "${methodName}" – trying next`);
    } catch (err) {
      const msg = `Source "${sourceName}" failed for "${methodName}": ${err.message}`;
      console.warn(`[fallback] ${msg}`);
      errors.push(msg);
    }
  }

  const detail = errors.length ? '\n  ' + errors.join('\n  ') : ' (no errors recorded)';
  throw new Error(`All sources failed for "${methodName}":${detail}`);
}

module.exports = { withFallback };
