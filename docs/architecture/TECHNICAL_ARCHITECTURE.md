# AASA Management System — Technical Architecture

Project: Abu-Aiman Students' Association (AASA)  
Repository: `Abu-Aiman-Students-Association/AASA-Management-System`  
Status: Living architecture; the approved AASA Master Blueprint remains authoritative.

## 1. Approved current stack

- Frontend: React, TypeScript, Vite; responsive/mobile-first.
- Backend: Supabase Auth and PostgreSQL.
- Authorization: PostgreSQL Row Level Security (RLS), least-privilege grants, and trusted database functions for privileged actions.
- Source control and CI: GitHub; GitHub Actions builds and deploys the Pages artifact.
- Languages: Hausa, English, Arabic; Arabic must use correct RTL layout.
- Hosting: GitHub Pages for the current static frontend deployment. Production domain and operational readiness must be verified before launch.

**Backend decision:** The project deliberately moved from Appwrite to Supabase after Appwrite implementation problems. Supabase is the current backend; do not revert this decision without explicit owner approval. Old Appwrite files/dependencies may remain during transition and must be audited before removal.

## 2. Security and data principles

1. Deny by default and enforce authorization in PostgreSQL, not just in the interface.
2. Never trust a role or user ID supplied by the browser as proof of authority.
3. Use Supabase Auth for identity and RLS/grants for record access.
4. Use carefully reviewed SECURITY DEFINER functions only where needed; pin a safe search_path and check auth.uid() plus role/permission on every privileged path.
5. Keep private bootstrap/configuration tables outside exposed schemas and do not create broad client policies to silence an advisor.
6. Record privileged actions in protected audit events; never log passwords, tokens, or unnecessary personal data.
7. Preserve existing records during migrations. Do not seed fake production members, finance records, welfare cases, or ballots.
8. Keep server secrets, service-role keys, and database passwords out of frontend source and `VITE_*` variables.
9. Test allowed and denied actions with authenticated and unauthenticated identities.
10. Do not claim any module is complete until its workflow, permissions, errors, and data persistence are tested.

## 3. Database foundation currently observed

The current Supabase project includes the public authorization foundation:
- `profiles`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `audit_events`

A private `super_admin_bootstrap` table supports one-time initial Super Admin claiming. Its no-policy RLS finding must be assessed alongside its private schema and grants; do not expose it to browser roles. The one-time claim function and admin account-management functions must be reviewed for execution grants, identity checks, protected-account rules, and audit coverage.

Database schema and migrations in GitHub must be reconciled with the live database before applying further migrations. Never assume repository files and production schema are identical.

## 4. Roles and permissions

The role/permission matrix is a design proposal until owner-approved. The current Super Admin and platform-admin implementation is not a substitute for the full association role model. Apply least privilege, explicit scope, separation of duties, and audit requirements. Never allow self-assignment of privileged roles.

## 5. Functional scope — all required modules

The approved blueprint governs the complete system, including:
- Overview/dashboard and association settings.
- Membership registration, review/approval, profiles, and QR membership cards.
- Leadership, terms of office, handover, committees, assignments, tasks, and activities.
- Meetings, attendance, minutes, events, calendars, announcements, and notifications.
- Elections, candidate management, eligibility, secret voting, results, and reports.
- Finance, income/expenditure, approvals, reconciliation, transaction references, and exports.
- Welfare, complaints, and confidential case handling.
- Projects, document/archive management, reports, and exports.
- User administration, role permissions, audit logs, backup/recovery.
- PWA installation, explicitly approved offline support, and Hausa/English/Arabic localization.

A visible navigation entry or placeholder is not a working module. Implement each workflow against the approved blueprint and verify end-to-end before marking it live.

## 6. Secret election requirements

- Verify eligibility server-side and prevent duplicate votes.
- Enforce opening/closing times server-side.
- Separate voter eligibility from ballot content.
- Do not store a directly joinable voter identity alongside a ballot.
- Restrict result publication to an authorized workflow.
- Review the threat model and test with adversarial/negative cases before any real election.

## 7. Financial controls

Use decimal-safe money representation (for example integer kobo), unique transaction references, supporting records, audit history, and explicit approval workflows. Enforce separation of duties when required; a user must not approve their own transaction where policy forbids it. Never represent sample transactions as actual association finances.

## 8. Privacy, localization, and offline operation

- Minimize and scope personal data.
- Protect audit events against unauthorized modification.
- Support Hausa, English, and Arabic with proper RTL/LTR layout.
- Cache only explicitly approved low-risk data. Do not insecurely cache sensitive finance, welfare, complaint, authentication, or secret-election data.
- Offline mode must never bypass server authorization or allow unverified election submissions.
- Define backup and recovery procedures and test restoration before production launch.

## 9. Release gates

Before a module or release is declared complete:
1. Inspect its schema, migrations, grants, RLS policies, and trusted functions.
2. Test authorized, unauthorized, and unauthenticated cases.
3. Verify data persistence and error handling.
4. Run the CI build and authorization tests.
5. Review Supabase Security Advisor and document accepted findings.
6. Verify the deployed site against the same commit.
