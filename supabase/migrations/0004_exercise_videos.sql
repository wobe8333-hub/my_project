create table exercise_videos (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  youtube_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table exercise_videos enable row level security;

create policy "로그인 사용자 전체 조회"
  on exercise_videos for select
  using (auth.role() = 'authenticated');
