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

test("election results use aggregate RPC and do not expose individual ballot rows to the browser", () => {
  assert.match(electionsSource, /rpc\(["']aasa_get_closed_election_results["']\)/);
  assert.doesNotMatch(electionsSource, /from\(["']aasa_secret_ballots["']\)/);
  assert.match(electionResultsMigration, /drop policy if exists aasa_secret_ballots_read_permission/i);
  assert.match(electionResultsMigration, /revoke select on table public\.aasa_secret_ballots from anon, authenticated/i);
  assert.match(ballotPrivilegesMigration, /revoke all privileges on table public\.aasa_secret_ballots from anon, authenticated/i);
  assert.ok(ballotFunctionMigration.includes("set search_path = ''"));
  assert.ok(ballotFunctionMigration.includes("auth.uid()"));
});
