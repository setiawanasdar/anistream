'use strict';

// Load environment variables first (before any other require that might read them)
require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');

const corsMiddleware  = require('./middleware/cors');
const { cacheMiddleware, stats: cacheStats } = require('./middleware/cache');

const animeRoutes    = require('./routes/anime');
const episodeRoutes  = require('./routes/episode');
const scheduleRoutes = require('./routes/schedule');
const imageRoutes    = require('./routes/image');
const malRoutes      = require('./routes/mal');

const { sources, fallbackOrder } = require('./config/sources');

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app  = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Security & global middleware
// ---------------------------------------------------------------------------

// Helmet sets various security-related HTTP headers
app.use(
  helmet({
    // Allow iframes to be embedded (useful if a frontend uses this API)
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS – allow all origins (see middleware/cors.js for config)
app.use(corsMiddleware);

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Rate limiting
// Prevent abuse: 200 requests per 15 minutes per IP
// ---------------------------------------------------------------------------
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX, 10)        || 200,
  standardHeaders: true,   // Return RateLimit headers
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'Too many requests – please try again later.',
  },
  skip: (req) => req.path === '/health', // Don't rate-limit health checks
});

app.use('/api', limiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Mount anime routes
app.use('/api/anime', animeRoutes);

// Mount episode routes
app.use('/api/episode', episodeRoutes);

// Mount schedule, genres, genre routes
app.use('/api', scheduleRoutes);

// Mount image proxy (no rate-limit, no cache – binary data)
app.use('/api/image', imageRoutes);

// Mount MyAnimeList integration routes
app.use('/api/mal', malRoutes);

// ---------------------------------------------------------------------------
// Health check endpoint
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  const enabledSources = Object.entries(sources)
    .filter(([, cfg]) => cfg.enabled)
    .map(([name, cfg]) => ({ name, baseUrl: cfg.baseUrl, priority: cfg.priority }))
    .sort((a, b) => a.priority - b.priority);

  res.json({
    success: true,
    status:  'ok',
    uptime:  process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    sources: enabledSources,
    cache: cacheStats(),
  });
});

// ---------------------------------------------------------------------------
// Debug endpoint – test scraper connectivity (only available in production for admin use)
// ---------------------------------------------------------------------------
app.get('/api/debug/sources', async (req, res) => {
  const { fetchHtml } = require('./utils/fetcher');
  const results = {};

  const testUrls = {
    otakudesu: (process.env.OTAKUDESU_URL || 'https://otakudesu.cloud') + '/',
    samehadaku: (process.env.SAMEHADAKU_URL || 'https://samehadaku.email') + '/',
    neonime: (process.env.NEONIME_URL || 'https://neonime.fun') + '/',
  };

  for (const [name, url] of Object.entries(testUrls)) {
    try {
      const html = await fetchHtml(url);
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      results[name] = {
        ok: true,
        title: titleMatch ? titleMatch[1].trim() : 'unknown',
        length: html.length,
      };
    } catch (err) {
      results[name] = { ok: false, error: err.message };
    }
  }

  res.json({ success: true, results });
});

// ---------------------------------------------------------------------------
// Root info endpoint
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    success: true,
    name:    'Anime Streaming API',
    version: '1.0.0',
    endpoints: {
      health:        'GET /health',
      ongoing:       'GET /api/anime/ongoing',
      complete:      'GET /api/anime/complete',
      popular:       'GET /api/anime/popular',
      search:        'GET /api/anime/search?q=<keyword>',
      animeDetail:   'GET /api/anime/:slug',
      episode:       'GET /api/episode/:slug',
      schedule:      'GET /api/schedule',
      genres:        'GET /api/genres',
      genre:         'GET /api/genre/:slug?page=<number>',
    },
  });
});

// ---------------------------------------------------------------------------
// 404 handler – must come AFTER all routes
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ---------------------------------------------------------------------------
// Global error handler – must have 4 parameters for Express to treat it as such
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[error] ${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    error:   message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       Anime Streaming API – v1.1.0       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Listening on  : http://localhost:${PORT}`);
  console.log(`  Environment   : ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('  Loaded sources (in fallback order):');
  fallbackOrder.forEach((name) => {
    const cfg = sources[name];
    const status = cfg && cfg.enabled ? '✓ enabled' : '✗ disabled';
    console.log(`    [${cfg ? cfg.priority : '?'}] ${name.padEnd(12)} ${status}  → ${cfg ? cfg.baseUrl : '(missing)'}`);
  });
  console.log('');
  console.log('  Available endpoints:');
  console.log('    GET /health');
  console.log('    GET /api/anime/ongoing');
  console.log('    GET /api/anime/complete');
  console.log('    GET /api/anime/popular');
  console.log('    GET /api/anime/search?q=...');
  console.log('    GET /api/anime/:slug');
  console.log('    GET /api/episode/:slug');
  console.log('    GET /api/schedule');
  console.log('    GET /api/genres');
  console.log('    GET /api/genre/:slug?page=N');
  console.log('    GET /api/image?url=<encoded_url>  ← image proxy');
  console.log('');

  // -------------------------------------------------------------------------
  // Self-ping keep-alive (production only)
  // Pings /health every 10 minutes to prevent Render.com free tier cold starts.
  // This eliminates the need for an external service like UptimeRobot.
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

    setInterval(async () => {
      try {
        const http = require('http');
        const https = require('https');
        const lib = SELF_URL.startsWith('https') ? https : http;
        lib.get(`${SELF_URL}/health`, (res) => {
          console.log(`[keep-alive] Self-ping → ${res.statusCode}`);
        }).on('error', (err) => {
          console.warn(`[keep-alive] Self-ping failed: ${err.message}`);
        });
      } catch (err) {
        console.warn(`[keep-alive] Self-ping error: ${err.message}`);
      }
    }, PING_INTERVAL_MS);

    console.log(`  Keep-alive    : self-ping every 10 min → ${SELF_URL}/health`);
    console.log('');
  }
});

module.exports = app; // exported for testing
