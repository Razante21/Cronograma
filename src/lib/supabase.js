import { createClient } from '@supabase/supabase-js';

const cfg = window.APP_CONFIG || {};
export const supabase = createClient(
  cfg.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
  cfg.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);
