-- Completed Mission owners may read their own Experience even while it remains
-- unpublished. The existing joined/published policies remain unchanged.
create policy "Owners can view their own Mission text experiences"
  on public.mission_text_experiences
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );

create policy "Owners can view their own Mission voices"
  on public.mission_voices
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );

create policy "Owners can read their own Mission voice objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'mission-voices'
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
    and exists (
      select 1
        from public.mission_voices as voice
       where voice.storage_path = storage.objects.name
         and voice.user_id = (select auth.uid())
    )
  );
