create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  height_cm numeric not null,
  weight_kg numeric not null,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  age integer not null,
  gender text not null check (gender in ('male','female')),
  experience_level text not null check (experience_level in ('beginner','intermediate','advanced')),
  weekly_days integer not null,
  session_minutes integer not null,
  goal text check (goal in ('cut','bulk','maintain')),
  environment text not null check (environment in ('gym','home')),
  gym_name text,
  allergies text[] not null default '{}',
  day_pointer integer not null default 1,
  last_progress_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gym_equipment (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipment text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_number integer not null,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_number)
);

create table daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_pointer integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, day_pointer)
);

alter table profiles enable row level security;
alter table gym_equipment enable row level security;
alter table weekly_plans enable row level security;
alter table daily_progress enable row level security;

create policy "본인 프로필만 조회/수정" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 기구 목록만 조회/수정" on gym_equipment
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 계획만 조회/수정" on weekly_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 진행기록만 조회/수정" on daily_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('inbody-photos', 'inbody-photos', false)
on conflict (id) do nothing;

create policy "본인 인바디 사진만 업로드"
  on storage.objects for insert
  with check (bucket_id = 'inbody-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "본인 인바디 사진만 조회"
  on storage.objects for select
  using (bucket_id = 'inbody-photos' and (storage.foldername(name))[1] = auth.uid()::text);
