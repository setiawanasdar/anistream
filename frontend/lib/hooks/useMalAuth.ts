'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type MalUser } from '../api';

const MAL_STORAGE_KEY = 'anistream_mal_auth';

export interface MalAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: MalUser | null;
}

export function useMalAuth() {
  const [auth, setAuth] = useState<MalAuthState>({
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null,
  });
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.accessToken) {
          setAuth(parsed);
          // Check if we need to refresh profile or token
          api.malGetUser(parsed.accessToken).then((res) => {
            if (res.success && res.data) {
              const updated = { ...parsed, user: res.data };
              setAuth(updated);
              localStorage.setItem(MAL_STORAGE_KEY, JSON.stringify(updated));
            }
          }).catch(() => {
            // ignore network errors
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAuth = useCallback((data: MalAuthState) => {
    setAuth(data);
    try {
      localStorage.setItem(MAL_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, []);

  const loginWithToken = useCallback(async (token: string, refreshToken?: string, expiresIn?: number) => {
    setLoading(true);
    try {
      const userRes = await api.malGetUser(token);
      if (userRes.success && userRes.data) {
        const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : Date.now() + 30 * 24 * 3600 * 1000;
        const newState: MalAuthState = {
          accessToken: token,
          refreshToken: refreshToken || null,
          expiresAt,
          user: userRes.data,
        };
        saveAuth(newState);
        return { success: true, user: userRes.data };
      } else {
        throw new Error(userRes.error || 'Token tidak valid atau telah kadaluwarsa.');
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal login dengan token.' };
    } finally {
      setLoading(false);
    }
  }, [saveAuth]);

  const loginWithCode = useCallback(async (code: string, codeVerifier: string, clientId?: string) => {
    setLoading(true);
    try {
      const tokenRes = await api.malExchangeToken({
        code,
        code_verifier: codeVerifier,
        client_id: clientId,
      });

      if (tokenRes.success && tokenRes.data?.access_token) {
        const token = tokenRes.data.access_token;
        const refreshToken = tokenRes.data.refresh_token;
        const expiresIn = tokenRes.data.expires_in;
        return await loginWithToken(token, refreshToken, expiresIn);
      } else {
        throw new Error(tokenRes.error || 'Pertukaran kode OAuth gagal.');
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal autentikasi dengan kode.' };
    } finally {
      setLoading(false);
    }
  }, [loginWithToken]);

  const logout = useCallback(() => {
    setAuth({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
    });
    try {
      localStorage.removeItem(MAL_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    isAuthenticated: !!auth.accessToken && !!auth.user,
    user: auth.user,
    accessToken: auth.accessToken,
    loading,
    loginWithToken,
    loginWithCode,
    logout,
  };
}
