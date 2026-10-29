-- Add nationality to the official AASA membership profile.
alter table public.aasa_members
  add column if not exists nationality text;

alter table public.aasa_members
  add constraint aasa_members_nationality_length
  check (nationality is null or length(trim(nationality)) <= 100);
