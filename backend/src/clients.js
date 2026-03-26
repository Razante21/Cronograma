import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';

export const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export const gemini = new GoogleGenAI({ apiKey: config.geminiApiKey });
