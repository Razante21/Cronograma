# Cronograma

Base estática do cronograma + estrutura inicial para backend com Supabase e Gemini.

## 1) Pré-requisitos

- Node.js 20+
- Projeto Supabase criado
- Chave de API do Gemini

## 2) Variáveis de ambiente

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Preencha no `.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

## 3) Banco (Supabase)

No SQL Editor do Supabase, rode:

- `supabase/schema.sql`

Também crie um bucket privado chamado `activities`.

## 4) Rodar API local

```bash
cd backend
npm install
npm run dev
```

Healthcheck:

```bash
curl http://localhost:8787/health
```

## 5) Teste de classificação Gemini

```bash
curl -X POST http://localhost:8787/api/classify \
  -H 'Content-Type: application/json' \
  -d '{
    "userId":"00000000-0000-0000-0000-000000000000",
    "fileName":"atividade_funcoes_logicas.xlsx",
    "extractedText":"Exercícios com SE, E, OU e referências absolutas"
  }'
```

## 6) Arquivos adicionados para setup

- `.env.example` → todas as keys necessárias.
- `supabase/schema.sql` → tabelas + RLS.
- `backend/` → API mínima para criar atividade e classificar com Gemini.
