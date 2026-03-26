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

### Configuração do `index.html` (sem build)

Para testar login direto no HTML estático, copie:

```bash
cp app_config.example.js app_config.js
```

E preencha no `app_config.js`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE` (ex.: `http://localhost:8787`)

Obs.: a conta `pcdsantos007@gmail.com` mantém visualização do template principal original ao logar.
Ao primeiro login de outras contas, o sistema pergunta quantidade de turmas e tipo de ciclo (`legacy` ou `mod12`) e salva isso por usuário.
Há uma tela de configuração (navbar botão `⚙ Configurar`) para editar ciclo, quantidade de turmas, data de início e nomes das turmas.
O chat também persiste histórico por usuário (mantém após F5/logout-login).
Cada aula também possui editor visual (modal) para título, descrição, data e link da atividade.

## 3) Banco (Supabase)

No SQL Editor do Supabase, rode:

- `supabase/schema.sql`

Também crie um bucket privado chamado `activities`.
Depois de atualizar o schema, rode novamente sua API para habilitar os endpoints de personalização de cards.
Essa atualização também inclui campo de link da atividade por aula (`activity_link`) e o endpoint de chat (`POST /api/chat`).

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

Se `SUPABASE_*`/`GEMINI_API_KEY` não estiverem configuradas, a API não cai mais; o `/health` mostra `integrations` como `false` e os endpoints retornam erro explicativo.
O backend também tenta carregar `.env` automaticamente da raiz do projeto ou de `backend/.env`.

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
