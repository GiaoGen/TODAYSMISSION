create table public.mission_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  status text not null default 'taken',
  taken_at timestamptz not null default now(),
  completed_at timestamptz null,
  primary key (user_id, mission_id),
  constraint mission_progress_status_check check (status in ('taken', 'completed')),
  constraint mission_progress_completion_state_check check (
    (status = 'taken' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  ),
  constraint mission_progress_completion_time_check check (
    completed_at is null or completed_at >= taken_at
  )
);

create index mission_progress_mission_id_idx
  on public.mission_progress (mission_id);

alter table public.mission_progress enable row level security;

revoke all privileges on table public.mission_progress from anon, authenticated;

grant select on table public.mission_progress to authenticated;
grant insert (user_id, mission_id) on table public.mission_progress to authenticated;

create policy "Users can view their own mission progress"
  on public.mission_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can take missions for themselves"
  on public.mission_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
