create table public.pack_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id uuid not null references public.packs(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

create index pack_memberships_pack_id_idx
  on public.pack_memberships (pack_id);

create table public.mission_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  completed_at timestamptz not null default now(),
  proof_path text not null,
  primary key (user_id, mission_id)
);

create index mission_completions_mission_id_idx
  on public.mission_completions (mission_id);

alter table public.pack_memberships enable row level security;
alter table public.mission_completions enable row level security;

revoke all privileges on table public.pack_memberships from anon, authenticated;
revoke all privileges on table public.mission_completions from anon, authenticated;

grant select (user_id, pack_id, joined_at) on table public.pack_memberships to authenticated;
grant insert (user_id, pack_id) on table public.pack_memberships to authenticated;
grant select (user_id, mission_id, completed_at) on table public.mission_completions to authenticated;

create policy "Users can view their own Pack memberships"
  on public.pack_memberships
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );

create policy "Users can join published Packs for themselves"
  on public.pack_memberships
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
    and exists (
      select 1
      from public.packs
      where packs.id = pack_memberships.pack_id
        and packs.is_published
    )
  );

create policy "Users can view their own Mission completions"
  on public.mission_completions
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );

insert into public.pack_memberships (user_id, pack_id, joined_at)
select progress.user_id, mission.pack_id, min(progress.taken_at)
from public.mission_progress as progress
join public.missions as mission on mission.id = progress.mission_id
group by progress.user_id, mission.pack_id
on conflict (user_id, pack_id) do nothing;

insert into public.mission_completions (user_id, mission_id, completed_at, proof_path)
select progress.user_id, progress.mission_id, progress.completed_at, progress.proof_path
from public.mission_progress as progress
where progress.status = 'completed'
on conflict (user_id, mission_id) do nothing;

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
  v_pack_id uuid;
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

  select completion.completed_at
    into v_completed_at
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  if found then
    return query select 'completed'::text, v_completed_at;
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

  insert into public.mission_completions (user_id, mission_id, completed_at, proof_path)
  values (v_user_id, p_mission_id, now(), p_proof_path)
  on conflict (user_id, mission_id) do nothing;

  select completion.completed_at
    into v_completed_at
    from public.mission_completions as completion
   where completion.user_id = v_user_id
     and completion.mission_id = p_mission_id;

  if not found then
    raise exception 'Mission cannot be completed.' using errcode = '42501';
  end if;

  return query select 'completed'::text, v_completed_at;
end;
$function$;

revoke all privileges on function public.complete_mission_with_audio(uuid, text)
  from public, anon, authenticated;

grant execute on function public.complete_mission_with_audio(uuid, text)
  to authenticated;

drop table public.mission_progress;
