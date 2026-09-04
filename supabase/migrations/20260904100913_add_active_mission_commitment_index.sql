create index pack_memberships_active_mission_pack_idx
  on public.pack_memberships (active_mission_id, pack_id)
  where active_mission_id is not null;
