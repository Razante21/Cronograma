import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';

const isPlaceholder = (v = '') => /YOUR_|SUA_|CHAVE_|PROJECT_REF/i.test(String(v));
const hasSupabase = Boolean(
  config.supabaseUrl &&
    config.supabaseServiceRoleKey &&
    !isPlaceholder(config.supabaseUrl) &&
    !isPlaceholder(config.supabaseServiceRoleKey)
);
const hasGemini = Boolean(config.geminiApiKey && !isPlaceholder(config.geminiApiKey));

let supabaseAdminInstance = null;
if (hasSupabase) {
  try {
    supabaseAdminInstance = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  } catch (error) {
    console.warn(`[config] Falha ao iniciar Supabase: ${error.message}`);
  }
}

let geminiInstance = null;
if (hasGemini) {
  try {
    geminiInstance = new GoogleGenAI({ apiKey: config.geminiApiKey });
  } catch (error) {
    console.warn(`[config] Falha ao iniciar Gemini: ${error.message}`);
  }
}

export const supabaseAdmin = supabaseAdminInstance;
export const gemini = geminiInstance;

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
