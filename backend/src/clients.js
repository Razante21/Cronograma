import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';

const hasSupabase = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
const hasGemini = Boolean(config.geminiApiKey);

export const supabaseAdmin = hasSupabase
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export const gemini = hasGemini ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;

export function requireSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.');
  }
  return supabaseAdmin;
}

export function requireGemini() {
  if (!gemini) {
    throw new Error('Gemini não configurado. Defina GEMINI_API_KEY no .env.');
  }
  return gemini;
}
