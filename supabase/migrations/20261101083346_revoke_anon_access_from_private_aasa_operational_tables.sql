-- Keep private operational records inaccessible to anonymous API clients.
-- Authenticated access remains governed by each table's existing RLS policies.
revoke all privileges on table
  public.aasa_complaints,
  public.aasa_financial_approvals,
  public.aasa_notifications,
  public.aasa_system_settings,
  public.aasa_tasks,
  public.aasa_voter_eligibility
from anon;
