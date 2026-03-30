// Gera v2/app_config.js a partir das variáveis de ambiente do Vercel
const fs = require('fs');

const config = `window.APP_CONFIG = {
  SUPABASE_URL: '${process.env.SUPABASE_URL || ''}',
  SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || ''}',
  API_BASE: '${process.env.API_BASE || ''}',
  GEMINI_API_KEY: '${process.env.GEMINI_API_KEY || ''}',
  GEMINI_MODEL: '${process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite'}'
};`;

fs.writeFileSync('v2/app_config.js', config);
console.log('✓ v2/app_config.js gerado');
