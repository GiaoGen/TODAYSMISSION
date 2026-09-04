create table public.mission_text_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  body text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint mission_text_experiences_body_check check (
    body = btrim(body)
    and char_length(body) between 1 and 2000
  )
);

create index mission_text_experiences_mission_published_idx
  on public.mission_text_experiences (mission_id, created_at desc, id)
  where is_published;

alter table public.mission_text_experiences enable row level security;

revoke all privileges on table public.mission_text_experiences from anon, authenticated;
grant select (id, mission_id, body, is_published, created_at)
  on table public.mission_text_experiences
  to authenticated;

create policy "Joined users can view published Mission text experiences"
  on public.mission_text_experiences
  for select
  to authenticated
  using (
    ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
    and is_published
    and exists (
      select 1
      from public.missions as mission
      join public.packs as pack on pack.id = mission.pack_id
      join public.pack_memberships as membership on membership.pack_id = pack.id
      where mission.id = mission_text_experiences.mission_id
        and mission.is_published
        and pack.is_published
        and membership.user_id = (select auth.uid())
    )
  );
