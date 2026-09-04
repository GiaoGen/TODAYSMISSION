alter table public.mission_completions
  add column proof_type text,
  add column proof_text text null;

-- Existing rows were all created by the audio-proof path. Keep their private
-- storage reference and explicitly backfill the discriminator before making it
-- required for new writes.
update public.mission_completions
   set proof_type = 'audio',
       proof_text = null
 where proof_type is null;

alter table public.mission_completions
  alter column proof_type set default 'audio',
  alter column proof_type set not null,
  alter column proof_path drop not null;

alter table public.mission_completions
  add constraint mission_completions_proof_type_check
    check (proof_type in ('audio', 'text')),
  add constraint mission_completions_proof_shape_check
    check (
      (proof_type = 'audio' and proof_path is not null and proof_text is null)
      or (
        proof_type = 'text'
        and proof_path is null
        and proof_text is not null
        and proof_text = btrim(proof_text)
        and char_length(btrim(proof_text)) between 1 and 1000
      )
    );

comment on column public.mission_completions.proof_type is
  'Private completion evidence discriminator; audio or text.';
comment on column public.mission_completions.proof_text is
  'Private text completion evidence. It is intentionally not granted to client reads.';

create or replace function public.complete_mission_with_audio(
  p_mission_id uuid,
  p_proof_path text,
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

  if p_mission_id is null or p_proof_path is null or p_completed_local_date is null then
    raise exception 'Mission proof is invalid.' using errcode = '22023';
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
    raise exception 'That mission is unavailable.' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.pack_memberships as membership
     where membership.user_id = v_user_id
       and membership.pack_id = v_pack_id
  ) then
    raise exception 'Pack must be taken before completing a Mission.' using errcode = '42501';
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

  if p_proof_path !~ (
    '^' || v_user_id::text || '/' || p_mission_id::text ||
    '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](webm|mp4)$'
  ) then
    raise exception 'Mission proof path is invalid.' using errcode = '22023';
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
   where object.bucket_id = 'mission-proofs'
     and object.name = p_proof_path;

  if not found
     or v_object_owner_id is distinct from v_user_id::text
     or v_object_mime is null
     or v_object_size is null
     or v_object_size < 1
     or v_object_size > 10485760
     or v_object_mime <> all (
       array['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4']::text[]
     ) then
    raise exception 'Mission proof is invalid.' using errcode = '42501';
  end if;

  insert into public.mission_completions (
    user_id, mission_id, completed_at, completed_local_date, proof_path, proof_type, proof_text
  )
  values (v_user_id, p_mission_id, now(), p_completed_local_date, p_proof_path, 'audio', null)
  on conflict (user_id, mission_id) do nothing;

  select completion.completed_at, completion.completed_local_date
    into v_completed_at, v_completed_local_date
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  if not found then
    raise exception 'Mission cannot be completed.' using errcode = '42501';
  end if;

  return query select 'completed'::text, v_completed_at, v_completed_local_date;
end;
$function$;

revoke all privileges on function public.complete_mission_with_audio(uuid, text, date)
  from public, anon, authenticated;

grant execute on function public.complete_mission_with_audio(uuid, text, date)
  to authenticated;

create or replace function public.complete_mission_with_text(
  p_mission_id uuid,
  p_proof_text text,
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
  v_completed_at timestamptz;
  v_completed_local_date date;
  v_proof_text text := btrim(p_proof_text);
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Permanent account required.' using errcode = '42501';
  end if;

  if p_mission_id is null or p_proof_text is null or p_completed_local_date is null then
    raise exception 'Mission proof is invalid.' using errcode = '22023';
  end if;

  if char_length(v_proof_text) < 1 or char_length(v_proof_text) > 1000 then
    raise exception 'Mission text proof is invalid.' using errcode = '22023';
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
    raise exception 'That mission is unavailable.' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.pack_memberships as membership
     where membership.user_id = v_user_id
       and membership.pack_id = v_pack_id
  ) then
    raise exception 'Pack must be taken before completing a Mission.' using errcode = '42501';
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

  insert into public.mission_completions (
    user_id, mission_id, completed_at, completed_local_date, proof_path, proof_type, proof_text
  )
  values (v_user_id, p_mission_id, now(), p_completed_local_date, null, 'text', v_proof_text)
  on conflict (user_id, mission_id) do nothing;

  select completion.completed_at, completion.completed_local_date
    into v_completed_at, v_completed_local_date
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  if not found then
    raise exception 'Mission cannot be completed.' using errcode = '42501';
  end if;

  return query select 'completed'::text, v_completed_at, v_completed_local_date;
end;
$function$;

revoke all privileges on function public.complete_mission_with_text(uuid, text, date)
  from public, anon, authenticated;

grant execute on function public.complete_mission_with_text(uuid, text, date)
  to authenticated;
