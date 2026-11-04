insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aasa-member-photos',
  'aasa-member-photos',
  false,
  5242880,
  array['image/jpeg','image/png']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png']::text[];

drop policy if exists "aasa_member_photos_read" on storage.objects;
create policy "aasa_member_photos_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'aasa-member-photos'
  and public.aasa_has_permission('membership.read')
);

drop policy if exists "aasa_member_photos_upload" on storage.objects;
create policy "aasa_member_photos_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'aasa-member-photos'
  and (
    public.aasa_has_permission('membership.create')
    or public.aasa_has_permission('membership.update')
  )
);

drop policy if exists "aasa_member_photos_delete" on storage.objects;
create policy "aasa_member_photos_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'aasa-member-photos'
  and (
    public.aasa_has_permission('membership.create')
    or public.aasa_has_permission('membership.update')
  )
);

drop policy if exists "aasa_legacy_member_photos_read" on storage.objects;
create policy "aasa_legacy_member_photos_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'aasa-documents'
  and (
    name like '%/member-photo-%'
    or name like 'member-applications/%'
  )
  and public.aasa_has_permission('membership.read')
);
