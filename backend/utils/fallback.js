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
      // Silently move to next provider if empty
    } catch (err) {
      const msg = `Source "${sourceName}" failed for "${methodName}": ${err.message}`;
      errors.push(msg);
    }
  }

  const detail = errors.length ? '\n  ' + errors.join('\n  ') : ' (no errors recorded)';
  throw new Error(`All sources failed for "${methodName}":${detail}`);
}

async function withParallelFallback(sourceOrder, methodName, ...args) {
  const activeSources = sourceOrder.filter((name) => sources[name] && sources[name].enabled);

  const promises = activeSources.map(async (sourceName) => {
    try {
      const scraper = require('../scrapers/' + sourceName);
      if (typeof scraper[methodName] !== 'function') return null;
      const result = await scraper[methodName](...args);
      const hasContent = Array.isArray(result)
        ? result.length > 0
        : result !== null && result !== undefined && (result.servers ? result.servers.length > 0 : true);
      if (hasContent) {
        return { data: result, source: sourceName };
      }
      return null;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(promises);
  for (const res of results) {
    if (res) return res;
  }

  throw new Error(`All sources failed for "${methodName}"`);
}

module.exports = { withFallback, withParallelFallback };
