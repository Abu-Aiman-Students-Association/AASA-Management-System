import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const supabaseSource = await readFile(new URL("../src/lib/supabase.ts", import.meta.url), "utf8");
const dashboardSource = await readFile(new URL("../src/AdminDashboard.tsx", import.meta.url), "utf8");
const accountsSource = await readFile(new URL("../src/AdminAccountsPanel.tsx", import.meta.url), "utf8");

test("browser Supabase client uses publishable configuration, not a service-role secret", () => {
  assert.match(supabaseSource, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(supabaseSource, /service_role|SUPABASE_SERVICE_ROLE_KEY|secret_key/i);
});

test("administrator access is gated by database-confirmed roles", () => {
  assert.match(dashboardSource, /user_roles/);
  assert.match(dashboardSource, /claim_initial_super_admin/);
  assert.match(dashboardSource, /account_status/);
  assert.match(dashboardSource, /SUPER_ADMIN_EMAIL/);
});

test("administrator account changes use database RPCs rather than direct client table writes", () => {
  assert.match(accountsSource, /rpc\(["']admin_list_accounts["']\)/);
  assert.match(accountsSource, /rpc\(["']admin_manage_account["']/);
  assert.doesNotMatch(accountsSource, /\.from\(["']user_roles["']\)\.(insert|update|delete)/);
});

test("permanent Super Admin and current account are protected in the UI", () => {
  assert.match(accountsSource, /protectedUser\s*\|\|\s*self/);
  assert.match(accountsSource, /SUPER_ADMIN_EMAIL/);
});

const electionsSource = await readFile(new URL("../src/ElectionsModule.tsx", import.meta.url), "utf8");
const electionResultsMigration = await readFile(new URL("../supabase/migrations/20261029163000_protect_anonymous_ballot_rows.sql", import.meta.url), "utf8");
const ballotPrivilegesMigration = await readFile(new URL("../supabase/migrations/20261029164000_revoke_direct_ballot_table_access.sql", import.meta.url), "utf8");
const ballotFunctionMigration = await readFile(new URL("../supabase/migrations/20261029165000_harden_secret_ballot_function_search_path.sql", import.meta.url), "utf8");
const electionResultsGrantMigration = await readFile(new URL("../supabase/migrations/20261029166000_restrict_closed_election_results_rpc.sql", import.meta.url), "utf8");

test("election results use aggregate RPC and do not expose individual ballot rows to the browser", () => {
  assert.match(electionsSource, /rpc\(["']aasa_get_closed_election_results["']\)/);
  assert.doesNotMatch(electionsSource, /from\(["']aasa_secret_ballots["']\)/);
  assert.match(electionResultsMigration, /drop policy if exists aasa_secret_ballots_read_permission/i);
  assert.match(electionResultsMigration, /revoke select on table public\.aasa_secret_ballots from anon, authenticated/i);
  assert.match(ballotPrivilegesMigration, /revoke all privileges on table public\.aasa_secret_ballots from anon, authenticated/i);
  assert.ok(ballotFunctionMigration.includes("set search_path = ''"));
  assert.ok(ballotFunctionMigration.includes("auth.uid()"));
  assert.match(electionResultsGrantMigration, /revoke all on function public\.aasa_get_closed_election_results\(\) from public, anon/i);
  assert.match(electionResultsGrantMigration, /grant execute on function public\.aasa_get_closed_election_results\(\) to authenticated/i);
});


const projectsSource = await readFile(new URL("../src/ProjectsModule.tsx", import.meta.url), "utf8");
const projectDashboardSource = await readFile(new URL("../src/AdminDashboard.tsx", import.meta.url), "utf8");
const projectMigration = await readFile(new URL("../supabase/migrations/20261030170000_projects_management_core.sql", import.meta.url), "utf8");
const projectGrantMigration = await readFile(new URL("../supabase/migrations/20261030173000_harden_projects_table_grants.sql", import.meta.url), "utf8");
const projectWorkflowMigration = await readFile(new URL("../supabase/migrations/20261030180000_project_workflow_integrity.sql", import.meta.url), "utf8");
const projectPrivacyMigration = await readFile(new URL("../supabase/migrations/20261030183000_restrict_project_budget_visibility.sql", import.meta.url), "utf8");
const projectBudgetLockMigration = await readFile(new URL("../supabase/migrations/20261030184000_lock_approved_project_budget.sql", import.meta.url), "utf8");

test("Projects workspace is connected to the administrator dashboard with database permission gates", () => {
  assert.match(projectDashboardSource, /ProjectsModule/);
  assert.match(projectDashboardSource, /projects\.manage/);
  assert.match(projectDashboardSource, /projects\.approve/);
  assert.match(projectsSource, /from\(["']aasa_projects["']\)/);
  assert.match(projectsSource, /aasa_list_project_assignable_members/);
  assert.match(projectsSource, /aasa_list_project_committees/);
});

test("Projects workspace covers proposals, teams, milestones, tasks, progress, risks and documents", () => {
  for (const table of ["aasa_project_members","aasa_project_milestones","aasa_project_tasks","aasa_project_progress_reports","aasa_project_risks","aasa_project_documents"]) {
    assert.ok(projectsSource.includes(table), "project workflow table is present");
  }
  assert.match(projectsSource, /aasa_review_project_budget/);
  assert.match(projectsSource, /aasa_request_project_completion/);
  assert.match(projectsSource, /aasa_review_project_completion/);
  assert.match(projectsSource, /Ayyuka da Ci gaban Ƙungiya/);
  assert.match(projectsSource, /المشاريع والتطوير/);
  assert.doesNotMatch(projectsSource, /insert\(\s*\{\s*title:\s*["']Demo/i);
});

test("project tables have RLS, permission policies and audited lifecycle RPCs", () => {
  assert.match(projectMigration, /enable row level security/i);
  assert.doesNotMatch(projectMigration, /revoke all on all tables in schema public/i);
  assert.match(projectMigration, /create policy aasa_projects_read_authorised/i);
  assert.match(projectMigration, /projects\.approve/);
  assert.match(projectMigration, /aasa_update_own_project_task/);
  assert.match(projectMigration, /aasa_review_project_budget/);
  assert.match(projectMigration, /aasa_review_project_completion/);
  assert.match(projectGrantMigration, /revoke all on table public\.%I from anon, authenticated, public/i);
  assert.match(projectGrantMigration, /revoke all on function public\.aasa_guard_project_approval_fields\(\) from public, anon, authenticated/i);
  assert.match(projectWorkflowMigration, /length\(btrim\(coalesce\(new\.completion_report,''\)\)\)<50/i);
  assert.match(projectWorkflowMigration, /This project status transition is not permitted/i);
  assert.match(projectBudgetLockMigration, /approved project budget is locked/i);
  assert.match(projectBudgetLockMigration, /final report awaiting review cannot be edited/i);
});


const memberDashboardSource = await readFile(new URL("../src/MemberDashboard.tsx", import.meta.url), "utf8");
const memberTasksSource = await readFile(new URL("../src/MyProjectTasks.tsx", import.meta.url), "utf8");

test("assigned project members can see and update only their own assigned tasks through a permission-checked RPC", () => {
  assert.match(memberDashboardSource, /MyProjectTasks/);
  assert.match(memberTasksSource, /aasa_list_my_project_tasks/);
  assert.match(memberTasksSource, /rpc\(["']aasa_update_own_project_task["']/);
  assert.match(projectMigration, /t\.assigned_to_member_id=v_member_id/i);
  assert.match(projectMigration, /aasa_is_project_member/);
  assert.match(projectPrivacyMigration, /aasa_list_my_project_tasks/);
  assert.match(projectPrivacyMigration, /projects\.approve/);
  assert.match(projectPrivacyMigration, /p\.status not in/);
});

const idCenterSource = await readFile(new URL("../src/IDCenterModule.tsx", import.meta.url), "utf8");
test("AASA ID Center is a dedicated dashboard section adjacent to Membership", () => {
  assert.ok(dashboardSource.includes("IDCenterModule"));
  assert.ok(dashboardSource.includes('"id_center"'));
  assert.ok(dashboardSource.includes('"cards.issue"'));
  assert.ok(dashboardSource.includes('"cards.revoke"'));
});
test("ID Center uses approved member-card RPCs and QR verification rather than direct card writes", () => {
  assert.ok(idCenterSource.includes("aasa_issue_member_card"));
  assert.ok(idCenterSource.includes("aasa_revoke_member_card"));
  assert.ok(idCenterSource.includes("QRCode.toDataURL"));
  assert.ok(idCenterSource.includes("window.print()"));
  assert.ok(!idCenterSource.includes('.from("aasa_member_cards").insert'));
  assert.ok(!idCenterSource.includes('.from("aasa_member_cards").update'));
  assert.ok(!idCenterSource.includes('.from("aasa_member_cards").delete'));
});

const publicVerificationSource = await readFile(new URL("../src/VerifyMemberCard.tsx", import.meta.url), "utf8");
const verificationFunctionSource = await readFile(new URL("../supabase/functions/aasa-public-card-verification/index.ts", import.meta.url), "utf8");
test("public QR verification shows extended details and photo only with member consent", () => {
  assert.match(publicVerificationSource, /aasa-public-card-verification/);
  assert.match(publicVerificationSource, /record\.consent_shared && m\.photo_url/);
  assert.match(publicVerificationSource, /m\.phone/);
  assert.match(publicVerificationSource, /m\.address/);
  assert.match(verificationFunctionSource, /membership_consent === true/);
  assert.match(verificationFunctionSource, /createSignedUrl\(m\.photo_path,600\)/);
  assert.match(verificationFunctionSource, /Cache-Control/);
  assert.doesNotMatch(verificationFunctionSource, /date_of_birth|emergency_contact_phone/);
});

const publicRegistrationSource = await readFile(new URL("../src/PublicMemberRegistration.tsx", import.meta.url), "utf8");
const registrationFunctionSource = await readFile(new URL("../supabase/functions/aasa-public-member-registration/index.ts", import.meta.url), "utf8");
const registrationPhotoMigration = await readFile(new URL("../supabase/migrations/20261031220000_require_member_registration_photo.sql", import.meta.url), "utf8");
test("public membership registration requires a validated passport photograph and submits through the secure upload function", () => {
  assert.match(publicRegistrationSource, /type="file"/);
  assert.match(publicRegistrationSource, /required=\{!photoFile\}/);
  assert.match(publicRegistrationSource, /photoFile\.size>5\*1024\*1024/);
  assert.match(publicRegistrationSource, /aasa-public-member-registration/);
  assert.match(registrationFunctionSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(registrationFunctionSource, /req\.headers\.get\("apikey"\)/);
  assert.match(registrationFunctionSource, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(registrationFunctionSource, /createClient/);
  assert.match(registrationFunctionSource, /aasa_submit_member_application/);
  assert.match(registrationFunctionSource, /member-applications\//);
  assert.match(registrationFunctionSource, /5 \* 1024 \* 1024/);
  assert.match(registrationPhotoMigration, /photo_path/);
  assert.match(registrationPhotoMigration, /revoke all on function public\.aasa_submit_member_application\(jsonb\) from public, anon, authenticated/i);
  assert.match(registrationPhotoMigration, /grant execute on function public\.aasa_submit_member_application\(jsonb\) to service_role/i);
});
test("membership identity card and QR verification explicitly label the unique member number as ID Number", () => {
  assert.match(idCenterSource, /memberNo:"ID number"/);
  assert.match(idCenterSource, /aasa-card-id-label/);
  assert.match(publicVerificationSource, /ID Number/);
});

const anonOperationalTablesMigration = await readFile(new URL("../supabase/migrations/20261101083346_revoke_anon_access_from_private_aasa_operational_tables.sql", import.meta.url), "utf8");
test("private operational AASA tables explicitly revoke anonymous table privileges", () => {
  for (const table of ["aasa_complaints","aasa_financial_approvals","aasa_notifications","aasa_system_settings","aasa_tasks","aasa_voter_eligibility"]) {
    assert.ok(anonOperationalTablesMigration.includes("public." + table), "private table is covered");
  }
  assert.match(anonOperationalTablesMigration, /revoke all privileges[\s\S]*from anon/i);
});
