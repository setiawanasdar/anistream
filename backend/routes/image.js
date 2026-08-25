'use strict';

const { fetchUrl } = require('../utils/fetcher');

/**
 * Image proxy route.
 * GET /api/image?url=<encoded_image_url>
 *
 * Fetches an image from a remote host and streams it back to the client.
 * This bypasses hotlink protection on scraper sources and ensures images
 * always load even when the source site is slow or blocks direct linking.
 *
 * Usage from frontend:
 *   <img src="https://your-api.onrender.com/api/image?url=https://otakudesu.cloud/..." />
 */

const router = require('express').Router();

// Simple in-memory cache for image URLs (just headers, not binary data)
const imageCache = new Map();
const IMAGE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing ?url= parameter' });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    // Basic validation – must be http/https
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }

  try {
    // responseType: 'arraybuffer' is required so axios returns raw binary (Buffer)
    // instead of a garbled string for image content
    const response = await fetchUrl(targetUrl, {
      timeout: 15000,
      retries: 2,
      referer: new URL(targetUrl).origin,
      responseType: 'arraybuffer',
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';

    // Only proxy image content types
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ success: false, error: 'URL is not an image' });
    }

    // Forward cache headers for browser caching (1 hour)
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'X-Proxied-From': new URL(targetUrl).hostname,
    });

    return res.send(Buffer.from(response.data));
  } catch (err) {
    console.warn(`[image-proxy] Failed to fetch ${targetUrl}: ${err.message}`);
    // Return a 1x1 transparent PNG as fallback instead of an error
    const transparentPixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set('Content-Type', 'image/png');
    return res.send(transparentPixel);
  }
});

module.exports = router;
