'use strict';

/**
 * MyAnimeList (MAL) API v2 Integration Routes
 * Mounted at: /api/mal
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { resolveAnilistId } = require('../scrapers/anilist');

const MAL_API_BASE = 'https://api.myanimelist.net/v2';
const MAL_OAUTH_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';

// Default / fallback Client ID (can be configured via MAL_CLIENT_ID environment variable)
const DEFAULT_CLIENT_ID = process.env.MAL_CLIENT_ID || '6114d00ca681b77c0115652520400e21';
const DEFAULT_CLIENT_SECRET = process.env.MAL_CLIENT_SECRET || '';

// ---------------------------------------------------------------------------
// POST /api/mal/token - Exchange code for access_token or refresh token
// ---------------------------------------------------------------------------
router.post('/token', async (req, res, next) => {
  const { code, code_verifier, refresh_token, client_id } = req.body;
  const clientId = client_id || DEFAULT_CLIENT_ID;

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    if (DEFAULT_CLIENT_SECRET) {
      params.append('client_secret', DEFAULT_CLIENT_SECRET);
    }

    if (refresh_token) {
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refresh_token);
    } else {
      if (!code || !code_verifier) {
        return res.status(400).json({
          success: false,
          error: 'code and code_verifier are required for token exchange.',
        });
      }
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('code_verifier', code_verifier);
    }

    const response = await axios.post(MAL_OAUTH_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AniStream/1.0',
      },
      timeout: 10000,
    });

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorData = err.response?.data || err.message;
    console.error('[mal/token] error:', errorData);
    return res.status(status).json({
      success: false,
      error: typeof errorData === 'object' ? errorData.message || errorData.error || 'Token exchange failed' : errorData,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/mal/user - Get logged-in user profile info
// ---------------------------------------------------------------------------
router.get('/user', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Authorization header is required.' });
  }

  try {
    const response = await axios.get(`${MAL_API_BASE}/users/@me`, {
      headers: {
        Authorization: authHeader,
        'User-Agent': 'AniStream/1.0',
      },
      timeout: 8000,
    });

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorData = err.response?.data || err.message;
    return res.status(status).json({
      success: false,
      error: typeof errorData === 'object' ? errorData.message || errorData.error || 'Failed to fetch user' : errorData,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/mal/animelist - Get user's anime list by status
// ---------------------------------------------------------------------------
router.get('/animelist', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Authorization header is required.' });
  }

  const status = req.query.status || ''; // 'watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    const params = new URLSearchParams({
      fields: 'list_status{status,score,num_episodes_watched,is_rewatching,updated_at},num_episodes,title,main_picture,synopsis,genres',
      limit: String(limit),
      offset: String(offset),
      sort: 'list_updated_at',
    });

    if (status) {
      params.append('status', status);
    }

    const response = await axios.get(`${MAL_API_BASE}/users/@me/animelist?${params.toString()}`, {
      headers: {
        Authorization: authHeader,
        'User-Agent': 'AniStream/1.0',
      },
      timeout: 10000,
    });

    // Format list items for clean frontend rendering
    const items = (response.data?.data || []).map((entry) => {
      const node = entry.node || {};
      const listStatus = entry.list_status || {};
      return {
        id: String(node.id),
        malId: node.id,
        title: node.title || '',
        poster: node.main_picture?.large || node.main_picture?.medium || '',
        type: 'TV',
        totalEpisodes: node.num_episodes || null,
        status: listStatus.status || 'unknown',
        score: listStatus.score || 0,
        numWatchedEpisodes: listStatus.num_episodes_watched || 0,
        updatedAt: listStatus.updated_at || '',
      };
    });

    return res.json({
      success: true,
      data: items,
      paging: response.data?.paging || null,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorData = err.response?.data || err.message;
    return res.status(status).json({
      success: false,
      error: typeof errorData === 'object' ? errorData.message || errorData.error || 'Failed to fetch anime list' : errorData,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/mal/update-status - Update anime status, watched episodes, score
// ---------------------------------------------------------------------------
router.post('/update-status', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Authorization header is required.' });
  }

  let { anime_id, title, status, num_watched_episodes, score } = req.body;

  try {
    // If anime_id is not known, resolve it via title/slug query
    if (!anime_id && title) {
      const resolved = await resolveAnilistId(title);
      anime_id = (typeof resolved === 'object' && resolved?.malId) || (typeof resolved === 'number' ? resolved : null);
    }

    if (!anime_id) {
      return res.status(400).json({
        success: false,
        error: 'anime_id could not be resolved. Please provide a valid MAL anime ID.',
      });
    }

    const form = new URLSearchParams();
    if (status) form.append('status', status);
    if (num_watched_episodes !== undefined && num_watched_episodes !== null) {
      form.append('num_watched_episodes', String(num_watched_episodes));
    }
    if (score !== undefined && score !== null) {
      form.append('score', String(score));
    }

    const response = await axios.put(`${MAL_API_BASE}/anime/${anime_id}/my_list_status`, form.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AniStream/1.0',
      },
      timeout: 8000,
    });

    return res.json({
      success: true,
      data: {
        animeId: anime_id,
        ...response.data,
      },
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorData = err.response?.data || err.message;
    console.error('[mal/update-status] error:', errorData);
    return res.status(status).json({
      success: false,
      error: typeof errorData === 'object' ? errorData.message || errorData.error || 'Failed to update status' : errorData,
    });
  }
});

module.exports = router;
