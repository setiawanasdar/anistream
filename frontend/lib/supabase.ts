import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nurlohsdvtghsujizsud.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zw2Yz1rU_5huDlP9LEen-Q_90y8swhD';

// Supabase client – returns null if env vars are not set (offline/localStorage mode)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);
