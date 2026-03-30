import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.resolve(__dirname, '..');

const explicitEnv = process.env.ENV_FILE ? path.resolve(process.env.ENV_FILE) : null;
const candidates = [
  explicitEnv,
  path.join(process.cwd(), '.env'),
  path.join(backendRoot, '.env'),
  path.join(repoRoot, '.env')
].filter(Boolean);

let loadedEnvPath = null;
for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    loadedEnvPath = candidate;
    break;
  }
}

if (!loadedEnvPath) {
  dotenv.config();
}

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Variável ausente: ${key}`);
  }
}
if (loadedEnvPath) {
  console.log(`[config] .env carregado de: ${loadedEnvPath}`);
} else {
  console.warn('[config] Nenhum .env encontrado automaticamente (usando apenas variáveis do ambiente).');
}

export const config = {
  port: Number(process.env.PORT || 8787),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview',
  aiConfidenceThreshold: Number(process.env.AI_CONFIDENCE_THRESHOLD || 0.72)
};
