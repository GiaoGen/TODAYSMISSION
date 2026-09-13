begin;

insert into public.missions (
  pack_id, slug, title, note, tag, code, theme_key, artwork_key, sort_order, is_published
)
select
  pack.id,
  'stop-waiting',
  'STOP WAITING',
  'What have you been waiting for someone else to do with you? Something you actually want. Something you’ve kept putting off because no one would come with you. Stop waiting. Go do it.',
  'DOING THINGS ALONE',
  'FINAL',
  'paper',
  'circle',
  170,
  false
from public.packs as pack
where pack.slug = 'go-alone'
on conflict (pack_id, slug) do update set
  title = excluded.title,
  note = excluded.note,
  tag = excluded.tag,
  code = excluded.code,
  theme_key = excluded.theme_key,
  artwork_key = excluded.artwork_key,
  sort_order = excluded.sort_order,
  is_published = false,
  updated_at = now();

-- This Pack-specific predicate is shared by RLS and the commitment/completion
-- RPCs so knowing the hidden Mission UUID never bypasses the 16/16 gate.
create or replace function public.is_stop_waiting_unlocked(p_pack_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and exists (
      select 1
        from public.packs as pack
        join public.pack_memberships as membership
          on membership.pack_id = pack.id
         and membership.user_id = auth.uid()
       where pack.id = p_pack_id
         and pack.slug = 'go-alone'
         and pack.is_published
    )
    and 16 = (
      select count(*)
        from public.missions as mission
       where mission.pack_id = p_pack_id
         and mission.is_published
    )
    and 16 = (
      select count(*)
        from public.mission_completions as completion
        join public.missions as mission on mission.id = completion.mission_id
       where completion.user_id = auth.uid()
         and mission.pack_id = p_pack_id
         and mission.is_published
    );
$function$;

revoke all privileges on function public.is_stop_waiting_unlocked(uuid)
  from public, anon, authenticated;
grant execute on function public.is_stop_waiting_unlocked(uuid)
  to authenticated;

drop policy if exists "Unlocked users can read STOP WAITING"
  on public.missions;

create policy "Unlocked users can read STOP WAITING"
  on public.missions
  for select
  to authenticated
  using (
    slug = 'stop-waiting'
    and not is_published
    and public.is_stop_waiting_unlocked(pack_id)
  );

create or replace function public.take_mission(
  p_pack_id uuid,
  p_mission_id uuid
)
returns table(status text, active_mission_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_mission_pack_id uuid;
  v_active_mission_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Permanent account required.' using errcode = '42501';
  end if;

  if p_pack_id is null or p_mission_id is null then
    raise exception 'Mission commitment is invalid.' using errcode = '22023';
  end if;

  select mission.pack_id
    into v_mission_pack_id
    from public.missions as mission
    join public.packs as pack on pack.id = mission.pack_id
   where mission.id = p_mission_id
     and mission.pack_id = p_pack_id
     and pack.is_published
     and (
       mission.is_published
       or (
         mission.slug = 'stop-waiting'
         and not mission.is_published
         and public.is_stop_waiting_unlocked(mission.pack_id)
       )
     );

  if not found then
    raise exception 'That Mission is unavailable.' using errcode = '42501';
  end if;

  select membership.active_mission_id
    into v_active_mission_id
    from public.pack_memberships as membership
   where membership.user_id = v_user_id
     and membership.pack_id = p_pack_id
   for update;

  if not found then
    raise exception 'Take this Pack before choosing a Mission.' using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.mission_completions as completion
     where completion.user_id = v_user_id
       and completion.mission_id = p_mission_id
  ) then
    raise exception 'That Mission is already completed.' using errcode = '42501';
  end if;

  if v_active_mission_id is not null then
    if v_active_mission_id = p_mission_id then
      return query select 'already_committed'::text, v_active_mission_id;
      return;
    end if;

    raise exception 'Another Mission is already active for this Pack.' using errcode = '55000';
  end if;

  update public.pack_memberships as membership
     set active_mission_id = p_mission_id
   where membership.user_id = v_user_id
     and membership.pack_id = p_pack_id
     and membership.active_mission_id is null;

  if not found then
    raise exception 'Another Mission is already active for this Pack.' using errcode = '55000';
  end if;

  return query select 'committed'::text, p_mission_id;
end;
$function$;

revoke all privileges on function public.take_mission(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.take_mission(uuid, uuid)
  to authenticated;

create or replace function public.complete_mission_with_text(
  p_mission_id uuid,
  p_body text,
  p_completed_local_date date
)
returns table(status text, completed_at timestamptz, completed_local_date date)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_pack_id uuid;
  v_active_mission_id uuid;
  v_completed_at timestamptz;
  v_completed_local_date date;
  v_body text := btrim(p_body);
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Permanent account required.' using errcode = '42501';
  end if;

  if p_mission_id is null or p_body is null or p_completed_local_date is null then
    raise exception 'Mission experience is invalid.' using errcode = '22023';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'Mission text experience is invalid.' using errcode = '22023';
  end if;

  if p_completed_local_date < current_date - 1
     or p_completed_local_date > current_date + 1 then
    raise exception 'Mission completion date is invalid.' using errcode = '22023';
  end if;

  select mission.pack_id
    into v_pack_id
    from public.missions as mission
    join public.packs as pack on pack.id = mission.pack_id
   where mission.id = p_mission_id
     and pack.is_published
     and (
       mission.is_published
       or (
         mission.slug = 'stop-waiting'
         and not mission.is_published
         and public.is_stop_waiting_unlocked(mission.pack_id)
       )
     );

  if not found then
    raise exception 'That Mission is unavailable.' using errcode = '42501';
  end if;

  select completion.completed_at, completion.completed_local_date
    into v_completed_at, v_completed_local_date
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  if found then
    return query select 'completed'::text, v_completed_at, v_completed_local_date;
    return;
  end if;

  select membership.active_mission_id
    into v_active_mission_id
    from public.pack_memberships as membership
   where membership.user_id = v_user_id
     and membership.pack_id = v_pack_id
   for update;

  if not found or v_active_mission_id is distinct from p_mission_id then
    raise exception 'Mission must be taken before completion.' using errcode = '42501';
  end if;

  select completion.completed_at, completion.completed_local_date
    into v_completed_at, v_completed_local_date
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  if found then
    return query select 'completed'::text, v_completed_at, v_completed_local_date;
    return;
  end if;

  if exists (
    select 1
      from public.mission_voices as voice
     where voice.user_id = v_user_id
       and voice.mission_id = p_mission_id
  ) then
    raise exception 'This Mission already has an audio experience.' using errcode = '23505';
  end if;

  insert into public.mission_text_experiences (user_id, mission_id, body)
  values (v_user_id, p_mission_id, v_body)
  on conflict (user_id, mission_id) do nothing;

  insert into public.mission_completions (user_id, mission_id, completed_local_date)
  values (v_user_id, p_mission_id, p_completed_local_date);

  select completion.completed_at, completion.completed_local_date
    into v_completed_at, v_completed_local_date
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  return query select 'completed'::text, v_completed_at, v_completed_local_date;
end;
$function$;

revoke all privileges on function public.complete_mission_with_text(uuid, text, date)
  from public, anon, authenticated;
grant execute on function public.complete_mission_with_text(uuid, text, date)
  to authenticated;

create or replace function public.complete_mission_with_audio(
  p_mission_id uuid,
  p_storage_path text,
  p_completed_local_date date
)
returns table(status text, completed_at timestamptz, completed_local_date date)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_pack_id uuid;
  v_active_mission_id uuid;
  v_completed_at timestamptz;
  v_completed_local_date date;
  v_object_owner_id text;
  v_object_mime text;
  v_object_size bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Permanent account required.' using errcode = '42501';
  end if;

  if p_mission_id is null or p_storage_path is null or p_completed_local_date is null then
    raise exception 'Mission experience is invalid.' using errcode = '22023';
  end if;

  if p_completed_local_date < current_date - 1
     or p_completed_local_date > current_date + 1 then
    raise exception 'Mission completion date is invalid.' using errcode = '22023';
  end if;

  select mission.pack_id
    into v_pack_id
    from public.missions as mission
    join public.packs as pack on pack.id = mission.pack_id
   where mission.id = p_mission_id
     and pack.is_published
     and (
       mission.is_published
       or (
         mission.slug = 'stop-waiting'
         and not mission.is_published
         and public.is_stop_waiting_unlocked(mission.pack_id)
       )
     );

  if not found then
    raise exception 'That Mission is unavailable.' using errcode = '42501';
  end if;

  select completion.completed_at, completion.completed_local_date
    into v_completed_at, v_completed_local_date
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  if found then
    return query select 'completed'::text, v_completed_at, v_completed_local_date;
    return;
  end if;

  select membership.active_mission_id
    into v_active_mission_id
    from public.pack_memberships as membership
   where membership.user_id = v_user_id
     and membership.pack_id = v_pack_id
   for update;

  if not found or v_active_mission_id is distinct from p_mission_id then
    raise exception 'Mission must be taken before completion.' using errcode = '42501';
  end if;

  select completion.completed_at, completion.completed_local_date
    into v_completed_at, v_completed_local_date
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  if found then
    return query select 'completed'::text, v_completed_at, v_completed_local_date;
    return;
  end if;

  if exists (
    select 1
      from public.mission_text_experiences as experience
     where experience.user_id = v_user_id
       and experience.mission_id = p_mission_id
  ) then
    raise exception 'This Mission already has a text experience.' using errcode = '23505';
  end if;

  if p_storage_path !~ (
    '^' || v_user_id::text || '/' || p_mission_id::text ||
    '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](webm|mp4)$'
  ) then
    raise exception 'Mission audio path is invalid.' using errcode = '22023';
  end if;

  select object.owner_id,
         object.metadata ->> 'mimetype',
         case
           when coalesce(object.metadata ->> 'size', '') ~ '^[0-9]+$'
             then (object.metadata ->> 'size')::bigint
           else null
         end
    into v_object_owner_id, v_object_mime, v_object_size
    from storage.objects as object
   where object.bucket_id = 'mission-voices'
     and object.name = p_storage_path;

  if not found
     or v_object_owner_id is distinct from v_user_id::text
     or v_object_mime is null
     or v_object_size is null
     or v_object_size < 1
     or v_object_size > 10485760
     or v_object_mime <> all (
       array['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4']::text[]
     ) then
    raise exception 'Mission audio is invalid.' using errcode = '42501';
  end if;

  insert into public.mission_voices (user_id, mission_id, storage_path)
  values (v_user_id, p_mission_id, p_storage_path);

  insert into public.mission_completions (user_id, mission_id, completed_local_date)
  values (v_user_id, p_mission_id, p_completed_local_date);

  select completion.completed_at, completion.completed_local_date
    into v_completed_at, v_completed_local_date
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  return query select 'completed'::text, v_completed_at, v_completed_local_date;
end;
$function$;

revoke all privileges on function public.complete_mission_with_audio(uuid, text, date)
  from public, anon, authenticated;
grant execute on function public.complete_mission_with_audio(uuid, text, date)
  to authenticated;

commit;
