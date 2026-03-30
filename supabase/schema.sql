create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  total_lessons int not null default 33,
  template_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.schedule_templates(id),
  start_date date,
  timezone text default 'America/Fortaleza',
  mode text default 'default',
  overrides_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.user_schedules(id) on delete cascade,
  lesson_number int not null check (lesson_number >= 1 and lesson_number <= 33),
  module text not null,
  lesson_date date,
  title text not null,
  topics_json jsonb default '[]'::jsonb,
  status text default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(schedule_id, lesson_number)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_ext text,
  mime_type text,
  file_size bigint,
  extracted_text text,
  detected_theme text,
  ai_confidence numeric(5,4),
  ai_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_links (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  source text not null default 'ai',
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(activity_id, lesson_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  attachments_json jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_card_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  title text not null,
  description text not null,
  activity_link text,
  lesson_date date,
  updated_at timestamptz not null default now(),
  unique(user_id, card_id)
);

alter table public.user_card_content
add column if not exists activity_link text;
alter table public.user_card_content
add column if not exists lesson_date date;

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  turma_count int not null default 1,
  cycle_type text not null default 'mod12', -- legacy | mod12
  module_count int not null default 1,
  start_date date,
  turmas_json jsonb not null default '[]'::jsonb,
  allow_ai_edits boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences add column if not exists start_date date;
alter table public.user_preferences add column if not exists turmas_json jsonb not null default '[]'::jsonb;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_schedules_updated on public.user_schedules;
create trigger trg_user_schedules_updated
before update on public.user_schedules
for each row execute function public.set_updated_at();

drop trigger if exists trg_lessons_updated on public.lessons;
create trigger trg_lessons_updated
before update on public.lessons
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_schedules enable row level security;
alter table public.lessons enable row level security;
alter table public.activities enable row level security;
alter table public.activity_links enable row level security;
alter table public.chat_messages enable row level security;
alter table public.schedule_templates enable row level security;
alter table public.user_card_content enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "templates_read_auth" on public.schedule_templates;
drop policy if exists "user_schedules_all_own" on public.user_schedules;
drop policy if exists "lessons_select_own" on public.lessons;
drop policy if exists "lessons_insert_own" on public.lessons;
drop policy if exists "lessons_update_own" on public.lessons;
drop policy if exists "lessons_delete_own" on public.lessons;
drop policy if exists "activities_all_own" on public.activities;
drop policy if exists "activity_links_select_own" on public.activity_links;
drop policy if exists "activity_links_insert_own" on public.activity_links;
drop policy if exists "activity_links_update_own" on public.activity_links;
drop policy if exists "activity_links_delete_own" on public.activity_links;
drop policy if exists "chat_all_own" on public.chat_messages;
drop policy if exists "user_card_content_all_own" on public.user_card_content;
drop policy if exists "user_preferences_all_own" on public.user_preferences;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

create policy "templates_read_auth" on public.schedule_templates
for select using (auth.role() = 'authenticated');

create policy "user_schedules_all_own" on public.user_schedules
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "lessons_select_own" on public.lessons
for select using (
  exists (
    select 1 from public.user_schedules s
    where s.id = lessons.schedule_id
      and s.user_id = auth.uid()
  )
);

create policy "lessons_insert_own" on public.lessons
for insert with check (
  exists (
    select 1 from public.user_schedules s
    where s.id = lessons.schedule_id
      and s.user_id = auth.uid()
  )
);

create policy "lessons_update_own" on public.lessons
for update using (
  exists (
    select 1 from public.user_schedules s
    where s.id = lessons.schedule_id
      and s.user_id = auth.uid()
  )
);

create policy "lessons_delete_own" on public.lessons
for delete using (
  exists (
    select 1 from public.user_schedules s
    where s.id = lessons.schedule_id
      and s.user_id = auth.uid()
  )
);

create policy "activities_all_own" on public.activities
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activity_links_select_own" on public.activity_links
for select using (
  exists (
    select 1 from public.activities a
    where a.id = activity_links.activity_id
      and a.user_id = auth.uid()
  )
);

create policy "activity_links_insert_own" on public.activity_links
for insert with check (
  exists (
    select 1 from public.activities a
    where a.id = activity_links.activity_id
      and a.user_id = auth.uid()
  )
);

create policy "activity_links_update_own" on public.activity_links
for update using (
  exists (
    select 1 from public.activities a
    where a.id = activity_links.activity_id
      and a.user_id = auth.uid()
  )
);

create policy "activity_links_delete_own" on public.activity_links
for delete using (
  exists (
    select 1 from public.activities a
    where a.id = activity_links.activity_id
      and a.user_id = auth.uid()
  )
);

create policy "chat_all_own" on public.chat_messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_card_content_all_own" on public.user_card_content
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_preferences_all_own" on public.user_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Feature: calendário automático e tags =====
alter table public.user_preferences add column if not exists weekdays_json jsonb not null default '[1,3]'::jsonb;
alter table public.user_preferences add column if not exists calendar_json jsonb not null default '{}'::jsonb;
alter table public.user_card_content add column if not exists tags text;

-- ===== Feature: sugestões da IA =====
create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  field text not null,
  current_value text,
  suggested_value text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_suggestions enable row level security;

drop trigger if exists trg_ai_suggestions_updated on public.ai_suggestions;
create trigger trg_ai_suggestions_updated
before update on public.ai_suggestions
for each row execute function public.set_updated_at();

drop policy if exists "ai_suggestions_all_own" on public.ai_suggestions;
create policy "ai_suggestions_all_own" on public.ai_suggestions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
