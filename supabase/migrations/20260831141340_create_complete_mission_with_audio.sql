create or replace function public.complete_mission_with_audio(
  p_mission_id uuid,
  p_proof_path text
)
returns table(status text, completed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_taken_at timestamptz;
  v_completed_at timestamptz;
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

  if p_mission_id is null or p_proof_path is null then
    raise exception 'Mission proof is invalid.' using errcode = '22023';
  end if;

  if p_proof_path !~ (
    '^' || v_user_id::text || '/' || p_mission_id::text ||
    '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](webm|mp4)$'
  ) then
    raise exception 'Mission proof path is invalid.' using errcode = '22023';
  end if;

  select progress.status, progress.taken_at, progress.completed_at
    into v_status, v_taken_at, v_completed_at
    from public.mission_progress as progress
   where progress.user_id = v_user_id
     and progress.mission_id = p_mission_id
   for update;

  if not found then
    raise exception 'Mission must be taken first.' using errcode = '42501';
  end if;

  if v_status = 'completed' then
    return query select v_status, v_completed_at;
    return;
  end if;

  if v_status <> 'taken' then
    raise exception 'Mission cannot be completed.' using errcode = '42501';
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

  update public.mission_progress as progress
     set status = 'completed',
         completed_at = now(),
         proof_path = p_proof_path
   where progress.user_id = v_user_id
     and progress.mission_id = p_mission_id
     and progress.status = 'taken'
     and progress.completed_at is null
     and progress.proof_path is null
     and progress.taken_at <= now();

  if not found then
    raise exception 'Mission cannot be completed.' using errcode = '42501';
  end if;

  return query
    select progress.status, progress.completed_at
      from public.mission_progress as progress
     where progress.user_id = v_user_id
       and progress.mission_id = p_mission_id;
end;
$function$;

revoke all privileges on function public.complete_mission_with_audio(uuid, text)
  from public, anon, authenticated;

grant execute on function public.complete_mission_with_audio(uuid, text)
  to authenticated;
