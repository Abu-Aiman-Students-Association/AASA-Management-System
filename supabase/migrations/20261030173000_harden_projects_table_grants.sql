-- Tighten only the newly added AASA project tables.
do $$
declare t text;
begin
  foreach t in array array['aasa_projects','aasa_project_members','aasa_project_milestones','aasa_project_tasks','aasa_project_progress_reports','aasa_project_risks','aasa_project_documents'] loop
    execute format('revoke all on table public.%I from anon, authenticated, public',t);
    execute format('grant all on table public.%I to service_role',t);
  end loop;
end $$;

grant select,insert,update on public.aasa_projects to authenticated;
grant select,insert,delete on public.aasa_project_members to authenticated;
grant select,insert,update on public.aasa_project_milestones to authenticated;
grant select,insert,update on public.aasa_project_tasks to authenticated;
grant select,insert on public.aasa_project_progress_reports to authenticated;
grant select,insert,update on public.aasa_project_risks to authenticated;
grant select,insert,delete on public.aasa_project_documents to authenticated;

-- This is a trigger-only function, never a Data API endpoint.
revoke all on function public.aasa_guard_project_approval_fields() from public, anon, authenticated;
