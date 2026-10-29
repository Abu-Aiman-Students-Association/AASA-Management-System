-- Additional standard AASA membership registration profile fields.
-- Existing records remain valid; new fields are optional unless the form requires the declaration.
alter table public.aasa_members
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists emergency_contact_phone text,
  add column if not exists occupation text,
  add column if not exists state_of_residence text,
  add column if not exists local_government_area text,
  add column if not exists membership_consent boolean not null default false;

alter table public.aasa_members
  add constraint aasa_members_emergency_contact_name_length
    check (emergency_contact_name is null or length(trim(emergency_contact_name)) <= 160),
  add constraint aasa_members_emergency_contact_relationship_length
    check (emergency_contact_relationship is null or length(trim(emergency_contact_relationship)) <= 80),
  add constraint aasa_members_emergency_contact_phone_length
    check (emergency_contact_phone is null or length(trim(emergency_contact_phone)) <= 30),
  add constraint aasa_members_occupation_length
    check (occupation is null or length(trim(occupation)) <= 120),
  add constraint aasa_members_state_length
    check (state_of_residence is null or length(trim(state_of_residence)) <= 120),
  add constraint aasa_members_lga_length
    check (local_government_area is null or length(trim(local_government_area)) <= 120);
