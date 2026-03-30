# Cronograma FIEC — Contexto do Projeto

> Atualizado: 2026-03-27. Leia este arquivo antes de qualquer alteração no projeto.

---

## O que é este projeto

Aplicação web single-page (`index.html`) para professores da FIEC gerenciarem cronogramas de aulas. A professora Gemi (pcdsantos007@gmail.com) é a proprietária e principal usuária.

**Funcionalidades:**
- Cronograma visual em grade de 2 colunas (turma 1 e turma 2)
- Wizard de configuração (ciclo, calendário, turmas, dias por turma)
- Edição manual de aulas (título, descrição, data, link de atividade, tags)
- IA via Gemini para sugestões e preenchimento automático
- Galeria pública de cronogramas de professores
- Login/cadastro via Supabase Auth

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML/CSS/JS vanilla (um único `index.html`) |
| Auth + DB | Supabase (JS CDN) |
| IA | Gemini API (`gemini-2.0-flash-lite` — **não usar** `gemini-3.1-flash-lite-preview`, modelo inválido) |
| Backend | Express.js em `backend/src/server.js` (só usado para `/api/chat` e servir arquivos) |
| Deploy | Local (arquivo ou `npm start` na pasta backend) |

**Configuração**: `app_config.js` (não commitado em repo público)
```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://senzgjavvzctxpxcsjtv.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_76_R8yHIxcR2QhdNBCi07Q_HQPpkEtf',
  API_BASE: 'http://localhost:8787',
  // Chave usada apenas localmente — não publicar este arquivo em repositório público
  GEMINI_API_KEY: 'AIzaSyAGlgSwMHyckixF-Azc1h63w0fH334T-Dg',
  GEMINI_MODEL: 'gemini-3.1-flash-lite-preview'
};

```

---

## Banco de Dados (Supabase)

### Tabelas

**`user_preferences`** — Uma linha por usuário
```
user_id         uuid  (FK → auth.users)
turma_count     int
cycle_type      text  ('mod12' | 'legacy')
module_count    int   (1 ou 2)
start_date      date
turmas_json     jsonb  (ex: ["Intermediário","Avançado"])
allow_ai_edits  boolean
weekdays_json   jsonb  (NOVO formato: [[1,3],[2,4]] — dias por turma)
calendar_json   jsonb  (NOVO formato: {t0_lesson_1:"2026-02-23", t1_lesson_1:"2026-02-24",...})
display_name    text
updated_at      timestamptz
```

**`user_card_content`** — Aulas editadas por usuário
```
user_id      uuid
card_id      text  (ex: 'i1','i2',...,'a1','a2',...)
title        text
description  text
activity_link text
lesson_date  date
tags         text
updated_at   timestamptz
```

**`chat_messages`** — Histórico do chat com IA

### SQL obrigatório (executar no SQL Editor do Supabase se ainda não feito)
```sql
-- Colunas necessárias
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS weekdays_json jsonb;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS calendar_json jsonb;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS allow_ai_edits boolean DEFAULT false;

-- RLS user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "write_own" ON user_preferences;
CREATE POLICY "write_own" ON user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "read_all" ON user_preferences;
CREATE POLICY "read_all" ON user_preferences FOR SELECT USING (true);

-- RLS user_card_content
ALTER TABLE user_card_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "write_own_cards" ON user_card_content;
CREATE POLICY "write_own_cards" ON user_card_content FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "read_all_cards" ON user_card_content;
CREATE POLICY "read_all_cards" ON user_card_content FOR SELECT USING (true);

-- Funções públicas (galeria)
CREATE OR REPLACE FUNCTION get_public_schedules()
RETURNS TABLE(user_id uuid, display_name text, turmas_json jsonb, turma_count int, module_count int, start_date date, cycle_type text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, display_name, turmas_json, turma_count, module_count, start_date, cycle_type
  FROM user_preferences LIMIT 30;
$$;

CREATE OR REPLACE FUNCTION get_public_cards(p_user_id uuid)
RETURNS TABLE(card_id text, title text, description text, activity_link text, lesson_date date, tags text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT card_id, title, description, activity_link, lesson_date, tags
  FROM user_card_content WHERE user_id = p_user_id ORDER BY lesson_date NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_public_schedules() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_cards(uuid) TO anon, authenticated;
```

---

## Estrutura do `index.html`

O arquivo tem ~2600 linhas. Estrutura aproximada:
- `1–200`: `<head>`, CSS global (variáveis, layout, cards, modais, wizard, etc.)
- `200–620`: HTML do app (`#landing-page`, `#app-content`, grid das aulas)
- `620–740`: Modais (wizard `#onb`, editor de aula `#edit-ov`, sugestões IA)
- `740–1200`: JS — helpers, templates, lógica de cards
- `1200–1700`: JS — `savePreferences`, `applyCalendarDates`, `getCalendarDate`, `renderTurmaFields`
- `1700–2000`: JS — auth, `applySessionUser`, `loadUserCards`, `ensurePreferences`
- `2000–2200`: JS — galeria pública (`loadPublicSchedules`, `openPublicSchedule`)
- `2200–2600`: JS — chat IA, sugestões, event listeners

### Funções críticas

| Função | Descrição |
|--------|-----------|
| `savePreferences(prefs)` | Salva config no banco — 3 tentativas (upsert, upsert sem colunas novas, delete+insert). Verifica após salvar. |
| `upsertCard(row)` | Salva aula no banco — tenta onConflict, fallback delete+insert |
| `loadUserCards(useEmptyBase)` | Carrega aulas do banco — se `true`, oculta template antes |
| `ensurePreferences()` | Lê preferências do banco — abre wizard se não existir |
| `applySessionUser(user)` | Chamado no login — branch especial para conta principal (pcdsantos007) |
| `getCalendarDate(cardId)` | Retorna data calculada para um card — suporta formato novo `t0_lesson_X` e legado `lesson_X` |
| `applyCalendarDates()` | Recalcula calendário por turma e aplica nos cards |
| `renderTurmaFields(count, values, weekdaysList)` | Renderiza campos de turma com seletor de dias por turma |
| `getPerTurmaWeekdays()` | Retorna `[[1,3],[2,4]]` dos checkboxes do wizard |

---

## Mapeamento de Cards

- `i1..i20` → coluna esquerda (`.ci`) → turma 0 → dias de `weekdays_json[0]`
- `a1..a20` → coluna direita (`.ca`) → turma 1 → dias de `weekdays_json[1]`
- Cards com `card_id` iniciando em `i` = turma 0, `a` = turma 1

### Formato do `calendar_json` (NOVO desde 2026-03-27)
```json
{
  "t0_lesson_1": "2026-02-23",
  "t0_lesson_2": "2026-02-25",
  "t1_lesson_1": "2026-02-24",
  "t1_lesson_2": "2026-02-26"
}
```
Legado (formato antigo): `{ "lesson_1": "2026-02-23" }` — ainda suportado como fallback em `getCalendarDate`.

---

## Conta principal vs contas de usuário

A constante `MAIN_TEMPLATE_EMAIL = 'pcdsantos007@gmail.com'` (da Gemi) tem comportamento especial:
- Na login: `restoreOriginalTemplateView()` → mostra template original
- Depois: `loadUserCards(false)` → carrega aulas editadas SEM ocultar o template
- `!isOwner` guard em `loadUserCards` para não ocultar cards quando count=0

Para todas as outras contas:
- `applyEmptyTemplateView()` → oculta o template
- `loadUserCards(true)` → carrega do banco
- Se 0 aulas no banco → todos os cards ficam ocultos (usuário começa do zero)

---

## Bugs conhecidos e status

| Bug | Status |
|-----|--------|
| Cards somem no F5 | **Corrigido** — `upsertCard` com fallback, erro explícito |
| savePreferences timeout silencioso | **Corrigido** — 3 tentativas, attempt 3 roda mesmo no timeout |
| Conta principal não carregava aulas salvas | **Corrigido** — `loadUserCards(false)` adicionado |
| Dias de aula iguais para todas as turmas | **Corrigido** — dias por turma no wizard, `weekdays_json` = array de arrays |
| Galeria pública não aparecia | **Corrigido** — funções SECURITY DEFINER + RLS read_all |
| Erro de auto-apply escondia toast de erro | **Corrigido** — salva todos os cards com `await Promise.all` antes do toast |
| display_name não era salvo no timing certo | **Corrigido** — atualiza `currentUser.user_metadata` localmente antes de salvar |

---

## O que ainda pode melhorar (não implementado)

- [ ] Mais de 2 turmas com colunas próprias (UI atual tem só 2 colunas fixas)
- [ ] Suporte a mais de 2 colunas no grid (precisaria de refactor do template HTML)
- [ ] Sincronização em tempo real entre abas (Supabase Realtime)
- [ ] Exportar cronograma como PDF
- [ ] Tema escuro
- [ ] Paginação na galeria pública (hoje mostra no máximo 30)

---

## Variáveis globais JS importantes

```js
let currentUser = null;       // usuário autenticado (Supabase Auth)
let userPreferences = null;   // objeto com prefs carregadas do banco
let userCards = {};           // { card_id: { title, description, lessonDate, ... } }
let sb = null;                // cliente Supabase
const MAIN_TEMPLATE_EMAIL = 'pcdsantos007@gmail.com';
```

---

## Como rodar localmente

```bash
cd backend
npm install
npm start   # escuta em http://localhost:8787
```

Abrir `index.html` no navegador (funciona como arquivo local também, mas preferir via servidor).

---

## Notas para a IA que vai continuar

1. **Nunca commitar `app_config.js`** — contém chaves de API
3. **Todo o app é o `index.html`** — não criar arquivos JS/CSS separados sem necessidade
4. **RLS é crítico** — qualquer nova tabela precisa de policies. Sem policy write = dados não salvam
5. **`savePreferences` tem verificação pós-save** — se a row não existir após o save, mostra o SQL de correção
6. **Formato `weekdays_json` mudou** — agora é `[[1,3],[2,4]]`. Código legado que lê `[1,3]` (flat) ainda funciona via fallback
7. **Formato `calendar_json` mudou** — agora é `{t0_lesson_1: "...", t1_lesson_1: "..."}`. Fallback legado `{lesson_1: "..."}` ainda funciona
