alter table public.pack_memberships
  add column active_mission_id uuid null;

comment on column public.pack_memberships.active_mission_id is
  'The one incomplete Mission this user has currently committed to in this Pack.';

-- A composite foreign key makes it impossible for a membership to point at a
-- Mission belonging to a different Pack, including when either row is edited.
alter table public.missions
  add constraint missions_id_pack_id_key unique (id, pack_id);

alter table public.pack_memberships
  add constraint pack_memberships_active_mission_pack_fkey
  foreign key (active_mission_id, pack_id)
  references public.missions (id, pack_id);

grant select (active_mission_id)
  on table public.pack_memberships
  to authenticated;

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
     and mission.is_published
     and pack.is_published;

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

-- Both completion RPCs run inside one database transaction. This trigger
-- validates that the committed Mission is the one being completed and clears
-- the membership lock in that same transaction after the completion row is
-- inserted. A failed proof or completion rolls the update back with it.
create or replace function public.clear_active_mission_after_completion()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_pack_id uuid;
  v_active_mission_id uuid;
begin
  select mission.pack_id
    into v_pack_id
    from public.missions as mission
   where mission.id = new.mission_id;

  if not found then
    raise exception 'That Mission is unavailable.' using errcode = '42501';
  end if;

  select membership.active_mission_id
    into v_active_mission_id
    from public.pack_memberships as membership
   where membership.user_id = new.user_id
     and membership.pack_id = v_pack_id
   for update;

  if not found or v_active_mission_id is distinct from new.mission_id then
    raise exception 'Mission must be taken before completion.' using errcode = '42501';
  end if;

  update public.pack_memberships as membership
     set active_mission_id = null
   where membership.user_id = new.user_id
     and membership.pack_id = v_pack_id
     and membership.active_mission_id = new.mission_id;

  return new;
end;
$function$;

revoke all privileges on function public.clear_active_mission_after_completion()
  from public, anon, authenticated;

drop trigger if exists mission_completions_clear_active_mission
  on public.mission_completions;

create constraint trigger mission_completions_clear_active_mission
after insert on public.mission_completions
deferrable initially immediate
for each row
execute function public.clear_active_mission_after_completion();
