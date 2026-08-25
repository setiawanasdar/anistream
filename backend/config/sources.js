'use strict';
require('dotenv').config();

/**
 * Source configuration for all scrapers.
 * Update baseUrl here or via environment variables when domains change.
 */
module.exports = {
  sources: {
    otakudesu: {
      name: 'Otakudesu',
      baseUrl: process.env.OTAKUDESU_URL || 'https://otakudesu.cloud',
      enabled: process.env.OTAKUDESU_ENABLED !== 'false',
      priority: 1,
    },
    samehadaku: {
      name: 'Samehadaku',
      baseUrl: process.env.SAMEHADAKU_URL || 'https://samehadaku.email',
      enabled: process.env.SAMEHADAKU_ENABLED !== 'false',
      priority: 2,
    },
    neonime: {
      name: 'Neonime',
      baseUrl: process.env.NEONIME_URL || 'https://neonime.fun',
      enabled: process.env.NEONIME_ENABLED !== 'false',
      priority: 3,
    },
  },
  /** Ordered list of sources to try when calling withFallback() */
  fallbackOrder: ['otakudesu', 'samehadaku', 'neonime'],
};
