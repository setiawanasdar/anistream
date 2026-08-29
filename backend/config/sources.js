'use strict';
require('dotenv').config();

/**
 * Source configuration for all scrapers (Integrated with wajik-anime-api sources).
 * Update baseUrl here or via environment variables when domains change.
 */
module.exports = {
  sources: {
    animeindo: {
      name: 'AnimeIndo (Kuramanime V2)',
      baseUrl: process.env.ANIMEINDO_URL || 'https://v20.kuramanime.ing',
      enabled: true,
      priority: 1,
    },
    otakudesu: {
      name: 'Otakudesu',
      baseUrl: process.env.OTAKUDESU_URL || 'https://otakudesu.blog',
      enabled: true,
      priority: 2,
    },
    kuramanime: {
      name: 'Kuramanime',
      baseUrl: process.env.KURAMANIME_URL || 'https://v20.kuramanime.ing',
      enabled: true,
      priority: 3,
    },
    oploverz: {
      name: 'Oploverz',
      baseUrl: process.env.OPLOVERZ_URL || 'https://oploverz.am',
      enabled: true,
      priority: 4,
    },
    samehadaku: {
      name: 'Samehadaku',
      baseUrl: process.env.SAMEHADAKU_URL || 'https://v1.samehadaku.how',
      enabled: false,
      priority: 5,
    },
    neonime: {
      name: 'Neonime',
      baseUrl: process.env.NEONIME_URL || 'https://neonime.fun',
      enabled: false,
      priority: 6,
    },
  },
  /** Ordered list of active sources to try when calling withFallback() */
  fallbackOrder: ['animeindo', 'otakudesu', 'kuramanime', 'oploverz'],
};
