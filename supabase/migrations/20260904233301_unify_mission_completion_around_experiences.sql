-- Preserve the private proof columns before removing them from the completion
-- record. Historical completion state remains in mission_completions; these
-- rows are only a compatibility archive for the old evidence references.
create table public.mission_completion_legacy_proofs (
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  proof_type text,
  proof_text text,
  proof_path text,
  archived_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.mission_completion_legacy_proofs enable row level security;
revoke all privileges on table public.mission_completion_legacy_proofs from public, anon, authenticated;

insert into public.mission_completion_legacy_proofs (
  user_id,
  mission_id,
  proof_type,
  proof_text,
  proof_path
)
select completion.user_id,
       completion.mission_id,
       completion.proof_type,
       completion.proof_text,
       completion.proof_path
  from public.mission_completions as completion
 where completion.proof_type is not null
    or completion.proof_text is not null
    or completion.proof_path is not null
on conflict (user_id, mission_id) do nothing;

alter table public.mission_completions
  drop column proof_type,
  drop column proof_text,
  drop column proof_path;

alter table public.mission_text_experiences
  add constraint mission_text_experiences_user_mission_key
  unique (user_id, mission_id);

drop function public.complete_mission_with_audio(uuid, text, date);
drop function public.complete_mission_with_text(uuid, text, date);
drop function public.submit_mission_voice(uuid, text);

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
     and mission.is_published
     and pack.is_published;

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
     and mission.is_published
     and pack.is_published;

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
