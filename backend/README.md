# Backend (API)

API mínima para:
- criar atividades no Supabase;
- classificar atividade com Gemini.

## Endpoints

- `GET /health`
- `POST /api/activities`
- `POST /api/classify`

## Rodando

```bash
cp ../.env.example ../.env
npm install
npm run dev
```

> Sem `.env` preenchido, a API ainda sobe, mas endpoints que dependem de integração vão retornar erro explicando qual chave falta.

## Variáveis obrigatórias

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

Opcional:
- `PORT` (default 8787)
- `GEMINI_MODEL` (default gemini-1.5-flash)
- `AI_CONFIDENCE_THRESHOLD` (default 0.72)
