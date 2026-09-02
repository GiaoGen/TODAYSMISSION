create table public.mission_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  storage_path text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create index mission_voices_mission_published_idx
  on public.mission_voices (mission_id, created_at, id)
  where is_published;

alter table public.mission_voices enable row level security;

revoke all privileges on table public.mission_voices from anon, authenticated;
grant select (id, mission_id, storage_path, is_published, created_at)
  on table public.mission_voices
  to authenticated;

create policy "Joined users can view published Mission voices"
  on public.mission_voices
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
      where mission.id = mission_voices.mission_id
        and mission.is_published
        and pack.is_published
        and membership.user_id = (select auth.uid())
      )
  );

create or replace function public.get_my_mission_voice_statuses(
  p_mission_ids uuid[]
)
returns table(mission_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return;
  end if;

  return query
    select voice.mission_id
      from public.mission_voices as voice
     where voice.user_id = auth.uid()
       and voice.mission_id = any(p_mission_ids);
end;
$function$;

revoke all privileges on function public.get_my_mission_voice_statuses(uuid[])
  from public, anon, authenticated;

grant execute on function public.get_my_mission_voice_statuses(uuid[])
  to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mission-voices',
  'mission-voices',
  false,
  10485760,
  array['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4']::text[]
);

create policy "Permanent users can upload their own mission voices"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'mission-voices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );

create policy "Joined users can read published Mission voices"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'mission-voices'
    and exists (
      select 1
      from public.mission_voices as voice
      join public.missions as mission on mission.id = voice.mission_id
      join public.packs as pack on pack.id = mission.pack_id
      join public.pack_memberships as membership on membership.pack_id = pack.id
      where voice.storage_path = storage.objects.name
        and voice.is_published
        and mission.is_published
        and pack.is_published
        and membership.user_id = (select auth.uid())
        and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
    )
  );

create or replace function public.submit_mission_voice(
  p_mission_id uuid,
  p_storage_path text
)
returns table(status text, voice_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_pack_id uuid;
  v_existing_voice_id uuid;
  v_object_owner_id text;
  v_object_mime text;
  v_object_size bigint;
  v_inserted_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Permanent account required.' using errcode = '42501';
  end if;

  if p_mission_id is null or p_storage_path is null then
    raise exception 'Mission voice is invalid.' using errcode = '22023';
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
      from public.mission_completions as completion
     where completion.user_id = v_user_id
       and completion.mission_id = p_mission_id
  ) then
    raise exception 'Complete this Mission before sharing an experience.' using errcode = '42501';
  end if;

  select voice.id
    into v_existing_voice_id
    from public.mission_voices as voice
   where voice.user_id = v_user_id
     and voice.mission_id = p_mission_id;

  if found then
    return query select 'already_shared'::text, v_existing_voice_id;
    return;
  end if;

  if p_storage_path !~ (
    '^' || v_user_id::text || '/' || p_mission_id::text ||
    '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](webm|mp4)$'
  ) then
    raise exception 'Mission voice path is invalid.' using errcode = '22023';
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
    raise exception 'Mission voice is invalid.' using errcode = '42501';
  end if;

  insert into public.mission_voices (user_id, mission_id, storage_path)
  values (v_user_id, p_mission_id, p_storage_path)
  on conflict (user_id, mission_id) do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    select voice.id
      into v_existing_voice_id
      from public.mission_voices as voice
     where voice.user_id = v_user_id
       and voice.mission_id = p_mission_id;

    return query select 'already_shared'::text, v_existing_voice_id;
    return;
  end if;

  select voice.id
    into v_existing_voice_id
    from public.mission_voices as voice
   where voice.user_id = v_user_id
     and voice.mission_id = p_mission_id;

  return query select 'submitted'::text, v_existing_voice_id;
end;
$function$;

revoke all privileges on function public.submit_mission_voice(uuid, text)
  from public, anon, authenticated;

grant execute on function public.submit_mission_voice(uuid, text)
  to authenticated;
