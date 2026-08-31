drop policy "Users can view their own mission progress"
  on public.mission_progress;

create policy "Users can view their own mission progress"
  on public.mission_progress
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );

drop policy "Users can take missions for themselves"
  on public.mission_progress;

create policy "Users can take missions for themselves"
  on public.mission_progress
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );
