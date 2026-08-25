'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../supabase';

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * useAuth hook
 * - Handles login / logout via Supabase magic link (email OTP)
 * - If Supabase is not configured, auth is disabled and user is always null
 * - Persists session via Supabase's built-in session storage
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }

    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email! } : null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email! } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase tidak dikonfigurasi');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, loading, signIn, signOut, isSupabaseEnabled };
}
