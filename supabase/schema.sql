-- FolioOS database. Paste into Supabase: SQL Editor > New query > Run.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------- Projects ----------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title       text not null check (char_length(title) between 1 and 120),
  kind        text not null check (kind in ('UI/UX','Branding','Illustration','Motion')),
  year        int  not null check (year between 1990 and 2100),
  role        text not null default '',
  tools       text[] not null default '{}',
  summary     text not null default '',
  problem     text not null default '',
  process     jsonb not null default '[]'::jsonb,
  result      text not null default '',
  palette     jsonb not null default '["#4b57d6","#c4478f","#1a8f9a","#0d1020"]'::jsonb,
  shape       text not null default 'rings' check (shape in ('rings','bars','blob','grid')),
  cover_url   text,
  images      text[] not null default '{}',
  published   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Comments (reviews with a star rating) ----------
create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  project_slug  text not null check (project_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null check (char_length(name) between 2 and 60),
  rating        smallint not null check (rating between 1 and 5),
  body          text not null check (char_length(body) between 5 and 1000),
  created_at    timestamptz not null default now()
);
create index if not exists comments_project_created_idx on public.comments (project_slug, created_at desc);

-- ---------- Row Level Security ----------
-- Visitors may READ published projects and all comments.
-- Nobody can write from the browser: all writes go through the Next.js API,
-- which validates input and uses the service-role key (which bypasses RLS).
alter table public.projects enable row level security;
alter table public.comments enable row level security;

drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects" on public.projects for select using (published = true);

drop policy if exists "public read comments" on public.comments;
create policy "public read comments" on public.comments for select using (true);

-- ---------- Storage for project images ----------
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "public read project images" on storage.objects;
create policy "public read project images" on storage.objects for select using (bucket_id = 'project-images');
-- No insert/update/delete policies: uploads happen server-side with the service-role key.


-- =====================================================================
-- v2 additions (safe to run again)
-- =====================================================================

-- ---------- Feedback moderation: comments wait for your approval ----------
alter table public.comments add column if not exists status text not null default 'pending' check (status in ('pending','approved'));
create index if not exists comments_status_idx on public.comments (status, created_at desc);

drop policy if exists "public read comments" on public.comments;
drop policy if exists "public read approved comments" on public.comments;
create policy "public read approved comments" on public.comments for select using (status = 'approved');

-- ---------- References (testimonials you curate) ----------
create table if not exists public.references_list (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  title       text not null default '' check (char_length(title) <= 120),
  company     text not null default '' check (char_length(company) <= 120),
  quote       text not null check (char_length(quote) between 1 and 400),
  link_url    text check (link_url is null or link_url ~ '^https://'),
  published   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.references_list enable row level security;
drop policy if exists "public read published references" on public.references_list;
create policy "public read published references" on public.references_list for select using (published = true);

-- ---------- Applications: private links per company ----------
-- No policies on purpose: only the server (service role) can read or write this table.
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  company         text not null check (char_length(company) between 1 and 80),
  role            text not null default '' check (char_length(role) <= 80),
  stage           text not null default 'draft' check (stage in ('draft','sent','viewed','interview','offer','rejected','closed')),
  featured_slug   text,
  note            text not null default '' check (char_length(note) <= 200),
  internal_notes  text not null default '' check (char_length(internal_notes) <= 1000),
  views           int  not null default 0,
  last_viewed_at  timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.applications enable row level security;

create or replace function public.touch_application(p_slug text) returns void
language sql security definer set search_path = public as $$
  update public.applications
     set views = views + 1,
         last_viewed_at = now(),
         stage = case when stage = 'sent' then 'viewed' else stage end
   where slug = p_slug;
$$;
revoke all on function public.touch_application(text) from public, anon, authenticated;

-- ---------- Analytics events (no cookies, no IP addresses stored) ----------
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  type              text not null check (type in ('view','project_open','resume_download','hire_open','contact_send','application_view')),
  project_slug      text,
  application_slug  text,
  referrer_host     text check (referrer_host is null or char_length(referrer_host) <= 100),
  created_at        timestamptz not null default now()
);
create index if not exists events_created_idx on public.events (created_at desc);
alter table public.events enable row level security;
