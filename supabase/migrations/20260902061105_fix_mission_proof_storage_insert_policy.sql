drop policy "Permanent users can upload their own mission proofs"
  on storage.objects;

create policy "Permanent users can upload their own mission proofs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'mission-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
  );
