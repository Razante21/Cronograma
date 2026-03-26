# Backend (API)

API mínima para:
- criar atividades no Supabase;
- classificar atividade com Gemini.

## Endpoints

- `GET /health`
- `GET /`
- `POST /api/activities`
- `POST /api/classify`
- `GET /api/cards/:userId`
- `POST /api/cards/upsert`
- `POST /api/chat`
- `GET /api/chat/messages/:userId`
- `POST /api/chat/messages`
- `GET /api/preferences/:userId`
- `POST /api/preferences/upsert`

## Rodando

```bash
cp ../.env.example ../.env
npm install
npm run dev
```

> Sem `.env` preenchido, a API ainda sobe, mas endpoints que dependem de integração vão retornar erro explicando qual chave falta.
> O loader busca `.env` nesta ordem: `ENV_FILE` (se definido), pasta atual, `backend/.env`, raiz do repositório.

## Variáveis obrigatórias

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

Opcional:
- `PORT` (default 8787)
- `GEMINI_MODEL` (default gemini-1.5-flash)
- `AI_CONFIDENCE_THRESHOLD` (default 0.72)
