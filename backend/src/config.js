import dotenv from 'dotenv';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Variável ausente: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT || 8787),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  aiConfidenceThreshold: Number(process.env.AI_CONFIDENCE_THRESHOLD || 0.72)
};
