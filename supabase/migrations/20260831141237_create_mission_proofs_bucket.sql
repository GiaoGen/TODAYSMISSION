insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mission-proofs',
  'mission-proofs',
  false,
  10485760,
  array['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4']::text[]
);

create policy "Permanent users can upload their own mission proofs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'mission-proofs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
    and coalesce(metadata ->> 'mimetype', '') = any (
      array['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4']::text[]
    )
    and case
      when coalesce(metadata ->> 'size', '') ~ '^[0-9]+$'
        then (metadata ->> 'size')::bigint between 1 and 10485760
      else false
    end
  );
