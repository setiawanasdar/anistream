/**
 * lib/supabase.ts
 * Safe Supabase client initialization.
 * Returns null if env vars are missing OR if the package fails to load.
 * This ensures the app works 100% without Supabase configured.
 */

let supabaseClient: any = null;
let enabled = false;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (url && key && url.startsWith('https://') && key.length > 20) {
  try {
    // Dynamic require so a missing package won't crash the entire app
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(url, key);
    enabled = true;
  } catch {
    console.warn('[supabase] Package not available – running in localStorage-only mode');
  }
}

export const supabase = supabaseClient;
export const isSupabaseEnabled = enabled;
