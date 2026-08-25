'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * useAuth – safe hook, returns null user if Supabase is not configured.
 * Uses lazy dynamic import so missing @supabase/supabase-js won't crash the app.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { supabase, isSupabaseEnabled } = await import('../supabase');
        if (!isSupabaseEnabled || !supabase) {
          setLoading(false);
          return;
        }
        setEnabled(true);
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ? { id: session.user.id, email: session.user.email! } : null);
        setLoading(false);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
          setUser(session?.user ? { id: session.user.id, email: session.user.email! } : null);
        });
        return () => subscription?.unsubscribe();
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string) => {
    const { supabase } = await import('../supabase');
    if (!supabase) throw new Error('Supabase tidak dikonfigurasi');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { supabase } = await import('../supabase');
      if (supabase) await supabase.auth.signOut();
    } catch { /* ok */ }
    setUser(null);
  }, []);

  return { user, loading, signIn, signOut, isSupabaseEnabled: enabled };
}
