insert into public.permissions (permission_key, module_key, description, action_key)
values
  ('welfare.cases.sensitive.read','welfare','Read highly restricted welfare and safeguarding cases','sensitive.read'),
  ('welfare.cases.sensitive.manage','welfare','Manage highly restricted welfare and safeguarding cases','sensitive.manage')
on conflict (permission_key) do update
set module_key=excluded.module_key,
    description=excluded.description,
    action_key=excluded.action_key;

drop policy if exists aasa_welfare_cases_read_permission on public.aasa_welfare_cases;
create policy aasa_welfare_cases_read_permission
on public.aasa_welfare_cases
for select
to authenticated
using (
  (
    confidentiality <> 'highly_restricted'
    and public.aasa_has_permission('welfare.cases.read')
  )
  or (
    confidentiality = 'highly_restricted'
    and (
      public.aasa_has_permission('welfare.cases.sensitive.read')
      or assigned_to = (select auth.uid())
    )
  )
);

drop policy if exists aasa_welfare_cases_update_permission on public.aasa_welfare_cases;
create policy aasa_welfare_cases_update_permission
on public.aasa_welfare_cases
for update
to authenticated
using (
  (
    confidentiality <> 'highly_restricted'
    and public.aasa_has_permission('welfare.cases.manage')
  )
  or (
    confidentiality = 'highly_restricted'
    and (
      public.aasa_has_permission('welfare.cases.sensitive.manage')
      or assigned_to = (select auth.uid())
    )
  )
)
with check (
  (
    confidentiality <> 'highly_restricted'
    and public.aasa_has_permission('welfare.cases.manage')
  )
  or (
    confidentiality = 'highly_restricted'
    and (
      public.aasa_has_permission('welfare.cases.sensitive.manage')
      or assigned_to = (select auth.uid())
    )
  )
);
