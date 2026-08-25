'use strict';

const cors = require('cors');

/**
 * CORS middleware configuration.
 * Allows all origins in development; you can restrict this in production
 * by setting ALLOWED_ORIGINS env var as a comma-separated list.
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : '*';

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 204,
};

module.exports = cors(corsOptions);
