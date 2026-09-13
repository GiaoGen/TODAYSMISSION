begin;

create schema if not exists private;
revoke all privileges on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_stop_waiting_unlocked(p_pack_id uuid)
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

revoke all privileges on function private.is_stop_waiting_unlocked(uuid)
  from public, anon, authenticated;
grant execute on function private.is_stop_waiting_unlocked(uuid)
  to authenticated;

-- Keep the policy/RPC call site stable, but remove privileged table access from
-- the exposed public wrapper. The SECURITY DEFINER implementation is private.
create or replace function public.is_stop_waiting_unlocked(p_pack_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_stop_waiting_unlocked(p_pack_id);
$function$;

revoke all privileges on function public.is_stop_waiting_unlocked(uuid)
  from public, anon, authenticated;
grant execute on function public.is_stop_waiting_unlocked(uuid)
  to authenticated;

commit;
