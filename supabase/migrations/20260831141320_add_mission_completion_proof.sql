alter table public.mission_progress
  add column proof_path text null;

alter table public.mission_progress
  drop constraint mission_progress_completion_state_check;

alter table public.mission_progress
  add constraint mission_progress_completion_state_check check (
    (status = 'taken' and completed_at is null and proof_path is null)
    or (status = 'completed' and completed_at is not null and proof_path is not null)
  );
