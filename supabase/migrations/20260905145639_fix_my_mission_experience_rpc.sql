-- Replace the table-read workaround with a narrowly scoped owner RPC. The
-- function returns only the public Experience DTO fields; user_id remains
-- unavailable to authenticated table reads.
drop function if exists public.get_my_mission_experience(uuid);

create function public.get_my_mission_experience(p_mission_id uuid)
returns table(
  id uuid,
  kind text,
  body text,
  storage_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
     or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    return;
  end if;

  if p_mission_id is null
     or not exists (
       select 1
         from public.mission_completions as completion
        where completion.user_id = v_user_id
          and completion.mission_id = p_mission_id
     ) then
    return;
  end if;

  return query
    select experience.id,
           experience.kind,
           experience.body,
           experience.storage_path,
           experience.created_at
      from (
        select text_experience.id,
               'text'::text as kind,
               text_experience.body,
               null::text as storage_path,
               text_experience.created_at
          from public.mission_text_experiences as text_experience
         where text_experience.user_id = v_user_id
           and text_experience.mission_id = p_mission_id
        union all
        select voice.id,
               'audio'::text as kind,
               null::text as body,
               voice.storage_path,
               voice.created_at
          from public.mission_voices as voice
         where voice.user_id = v_user_id
           and voice.mission_id = p_mission_id
      ) as experience
     order by experience.created_at desc, experience.id desc
     limit 1;
end;
$function$;

revoke all privileges on function public.get_my_mission_experience(uuid)
  from public, anon, authenticated;

grant execute on function public.get_my_mission_experience(uuid)
  to authenticated;

-- The earlier owner-policy migration may or may not have reached the remote
-- project. Recreate its final policies safely without changing table grants.
drop policy if exists "Owners can view their own Mission text experiences"
  on public.mission_text_experiences;

create policy "Owners can view their own Mission text experiences"
  on public.mission_text_experiences
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );

drop policy if exists "Owners can view their own Mission voices"
  on public.mission_voices;

create policy "Owners can view their own Mission voices"
  on public.mission_voices
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );

drop policy if exists "Owners can read their own Mission voice objects"
  on storage.objects;

create policy "Owners can read their own Mission voice objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'mission-voices'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );
