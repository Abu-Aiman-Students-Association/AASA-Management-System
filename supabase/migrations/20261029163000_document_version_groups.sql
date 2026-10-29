alter table public.aasa_documents
  add column if not exists document_group_id uuid not null default gen_random_uuid();
create index if not exists aasa_documents_group_version_idx
  on public.aasa_documents(document_group_id, version desc);
