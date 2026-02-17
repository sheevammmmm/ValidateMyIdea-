-- ValidateMyIdea.com initial schema
-- Run with Supabase migrations

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'agency')),
  stripe_customer_id text unique,
  validations_used_this_month integer not null default 0 check (validations_used_this_month >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  idea_text text not null,
  industry text,
  target_customer text,
  stage text not null default 'pre-idea' check (stage in ('pre-idea', 'mvp', 'launched')),
  signal_score integer check (signal_score between 0 and 100),
  verdict text check (verdict in ('BUILD', 'PIVOT', 'PASS')),
  founder_fit_score integer check (founder_fit_score between 0 and 100),
  report_url text,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.validations (id) on delete cascade,
  source text not null check (source in ('reddit', 'hn', 'ph', 'twitter', 'trends', 'appstore', 'g2')),
  data jsonb not null default '{}'::jsonb,
  pain_quotes jsonb not null default '[]'::jsonb,
  competitors jsonb not null default '[]'::jsonb,
  demand_score integer check (demand_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.founder_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  domain_expertise text[] not null default '{}',
  years_experience text,
  key_skills text[] not null default '{}',
  budget text,
  time_commitment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists validations_user_id_idx on public.validations (user_id);
create index if not exists validations_created_at_idx on public.validations (created_at desc);
create index if not exists signals_validation_id_idx on public.signals (validation_id);
create index if not exists signals_source_idx on public.signals (source);
create index if not exists founder_profiles_user_id_idx on public.founder_profiles (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_validations_updated_at on public.validations;
create trigger set_validations_updated_at
before update on public.validations
for each row
execute function public.set_updated_at();

drop trigger if exists set_founder_profiles_updated_at on public.founder_profiles;
create trigger set_founder_profiles_updated_at
before update on public.founder_profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.validations enable row level security;
alter table public.signals enable row level security;
alter table public.founder_profiles enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
on public.users
for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.users;
create policy "Users can delete own profile"
on public.users
for delete
using (auth.uid() = id);

drop policy if exists "Users can view own validations" on public.validations;
create policy "Users can view own validations"
on public.validations
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own validations" on public.validations;
create policy "Users can create own validations"
on public.validations
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own validations" on public.validations;
create policy "Users can update own validations"
on public.validations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own validations" on public.validations;
create policy "Users can delete own validations"
on public.validations
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own signals" on public.signals;
create policy "Users can view own signals"
on public.signals
for select
using (
  exists (
    select 1
    from public.validations v
    where v.id = signals.validation_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own signals" on public.signals;
create policy "Users can create own signals"
on public.signals
for insert
with check (
  exists (
    select 1
    from public.validations v
    where v.id = signals.validation_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own signals" on public.signals;
create policy "Users can update own signals"
on public.signals
for update
using (
  exists (
    select 1
    from public.validations v
    where v.id = signals.validation_id
      and v.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.validations v
    where v.id = signals.validation_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own signals" on public.signals;
create policy "Users can delete own signals"
on public.signals
for delete
using (
  exists (
    select 1
    from public.validations v
    where v.id = signals.validation_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists "Users can view own founder profile" on public.founder_profiles;
create policy "Users can view own founder profile"
on public.founder_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own founder profile" on public.founder_profiles;
create policy "Users can create own founder profile"
on public.founder_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own founder profile" on public.founder_profiles;
create policy "Users can update own founder profile"
on public.founder_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own founder profile" on public.founder_profiles;
create policy "Users can delete own founder profile"
on public.founder_profiles
for delete
using (auth.uid() = user_id);
