const { execSync } = require('child_process');
const fs = require('fs');

// Gera public/app_config.js a partir das env vars do Vercel
const config = `window.APP_CONFIG = {
  SUPABASE_URL: '${process.env.VITE_SUPABASE_URL || ''}',
  SUPABASE_ANON_KEY: '${process.env.VITE_SUPABASE_ANON_KEY || ''}',
  GEMINI_API_KEY: '${process.env.VITE_GEMINI_API_KEY || ''}',
  GEMINI_MODEL: '${process.env.VITE_GEMINI_MODEL || 'gemini-3.1-flash-lite-preview'}',
  ANTHROPIC_API_KEY: '${process.env.VITE_ANTHROPIC_API_KEY || ''}',
};`;

fs.writeFileSync('public/app_config.js', config);
console.log('✓ public/app_config.js gerado');
execSync('npm run build', { stdio: 'inherit' });
