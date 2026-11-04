# AASA Master Module Architecture

**Product:** Abu-Aiman Students' Association (AASA) Management System  
**Purpose:** Architecture baseline for completing the association platform without duplicating existing workflows or weakening access control.  
**Backend:** Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions)  
**Languages:** English, Hausa and Arabic (RTL for Arabic)  
**Data rule:** Real association data only. Never seed fake members, votes, finances, cases or documents.

> This document is an architecture plan, not a claim that every workflow is production-ready. The implementation status document remains the evidence record for what exists and what has passed verification.

## 1. Architecture principles

1. **One association identity per member.** Membership is the master record. ID cards, dues, elections, attendance, welfare and project participation reference that member; they must not create duplicate member identities.
2. **Permission-first.** Super Admin, association officers, committee officers, finance officers, election reviewers and ordinary members receive only the permissions needed for their duties. UI hiding is not security; RLS and trusted database functions enforce access.
3. **Audit important actions.** Approval, rejection, suspension, appointment, vote lifecycle changes, finance approval/settlement, case access, document access changes and role changes must be attributable and auditable.
4. **Private by default.** Member photos, identity details, ballots, welfare/case records and internal documents are not public. Public QR verification returns only the minimum safe card status and display fields.
5. **No duplicate modules.** New capabilities should extend an existing module when the workflow belongs there. Add a separate navigation module only when it has a distinct owner, workflow and permission boundary.
6. **Multilingual from the data model outward.** All user-facing labels, validation, notifications, emails and printable documents must support EN/HA/AR; Arabic layouts must use RTL.
7. **Mobile-first and low-bandwidth.** Paginated lists, server-side search, small uploads, clear loading/empty/error states and resilient forms.
8. **Traceable delivery.** Each module has acceptance tests, including denied-access tests, before being called complete.

## 1A. Strict module ownership — mandatory rule

A module owns its own screens, forms, validations, writes, lifecycle transitions, exports and audit events. No module may perform another module's business operation, expose another module's create/edit/approve/revoke controls, or write directly to another module's owned records.

Cross-module interaction is limited to:
- **Read-only reference lookup:** display the minimum fields needed to select a valid member, committee, project or document.
- **Stable foreign-key reference:** store the ID of the related record in the current module's own table.
- **Permission-checked hand-off:** open the owning module for the action. The action itself is completed and audited there.
- **Overview-only aggregation:** Overview may show permission-filtered counts and links, but it cannot create or change module records.

Examples:
- Membership alone registers, reviews, approves, rejects, suspends and updates member records. It does not issue, print or revoke identity cards.
- ID Centre alone issues, prints, verifies and revokes cards. It may read the minimum approved member identity fields, but cannot approve or edit membership.
- Finance alone owns dues, contributions, receipts, budgets, approvals, settlements and reconciliation. Membership may show membership status but must not collect or approve money.
- Meetings alone owns event scheduling, invitations, attendance and minutes. Projects cannot create meetings or maintain attendance.
- Projects alone owns project proposals, teams, milestones, tasks, progress and project risks. Finance may approve project budgets through an explicitly permissioned finance decision workflow, but cannot manage project tasks.
- Documents & Reports alone owns the document register, upload lifecycle, access classification, versioning, archive and retention. Other modules may link an authorised document ID to their own record; they may not upload, edit or archive that document as a side effect.
- Announcements & Notifications alone owns announcements and notification delivery/inbox. Other modules may request a notification through a defined interface, but may not write announcement records.
- Welfare Support alone owns confidential welfare cases. Membership and other modules may not view or edit case details.
- Complaints & Appeals alone owns complaint review, decisions and appeals. Other modules may not resolve or alter complaint records.
- Leadership & Committees alone owns office positions, appointments, committee membership and terms. Elections may reference a position but may not appoint office holders.
- Elections alone owns nomination, candidate review, voting phases, ballots and election results. Governance may consume certified outcomes only through a controlled hand-off; it cannot alter ballots or results.
- Administration & Security alone owns accounts, roles, permissions, security settings and platform audit administration. Other modules cannot assign roles or change permissions.

A shared Supabase database does **not** mean shared business ownership. Each table, storage namespace and privileged RPC must have a named owning module. If two modules need the same business action, move that action to the owner and expose a narrow, permission-checked interface rather than duplicating the workflow.

## 2. Roles and permission boundaries

| Role / capability group | Core access |
|---|---|
| Super Admin | Platform configuration, account/role administration and association-wide oversight; protected from self-lockout and ordinary officer actions |
| Association Executive / authorised officer | Only the governance and operational permissions explicitly assigned |
| Membership Officer | Member applications, member record review and membership status |
| ID Centre Officer | Issue/revoke/print cards; cannot approve membership unless separately authorised |
| Secretary / Meeting Officer | Meetings, attendance, minutes and assembly records |
| Election Manager | Election setup, nominations and election lifecycle; no access to individual secret ballots |
| Results Reviewer | Aggregate results after closure only, where separately authorised |
| Finance Officer | Draft income/expense records and supporting evidence; approval/settlement separated where policy requires |
| Finance Approver / Treasurer | Approve/reject eligible entries and perform permitted settlement/reconciliation |
| Welfare Officer | Assigned confidential cases only; access is restricted and audited |
| Project / Committee Lead | Assigned project, team, milestones, tasks, reports and approved budget scope |
| Ordinary Member | Own profile and permitted self-service; public announcements and eligible participation |
| Alumni / Chapter Coordinator | Only their verified alumni or chapter scope, once those capabilities are approved and implemented |

**Authorization rule:** permissions are explicit and granular (for example, `membership.review`, `cards.read`, `cards.issue`, `cards.revoke`, `elections.manage`, `elections.results.review`, `finance.transactions.approve`, `welfare.cases.read`). A role name alone must not grant broad access. The permission catalogue's `module_key` must match the owning workspace (for example, `cards.read`, `cards.issue` and `cards.revoke` belong to `id_center`; `complaints.*` belongs to `complaints`; `tasks.manage` belongs to `projects`). This grouping does not change permission keys or grant new access. Sensitive RPCs must validate `auth.uid()`, required permission and record scope; use a fixed/empty `search_path` where appropriate. Never authorize from user-editable metadata.

## 3. Existing core modules (retain and complete)

These 13 modules already appear in the current application/source. Their presence in navigation does not mean every workflow has passed live verification.

| # | Module | Owns | Connects to |
|---|---|---|---|
| 1 | Overview | Permission-filtered operational summary, alerts and shortcuts | All permitted modules |
| 2 | Membership | Applications, member master record, approval, status, profile and membership history | ID Centre, Dues, Elections, Meetings, Welfare, Projects, Member Portal |
| 3 | ID Centre | Card register, issue/revoke, print and public QR verification | Membership, public verification |
| 4 | Leadership & Committees | Positions, terms, appointments, committees and assignments | Meetings, Projects, Finance approvals, Governance |
| 5 | Elections | Election setup, nomination, candidate review, secret ballot lifecycle and aggregate results | Membership, Leadership |
| 6 | Meetings & Events | Schedule, invitations, attendance, minutes and event records | Membership, Leadership, General Assembly |
| 7 | Projects & Development | Proposals, ownership, team, budget request, milestones, tasks, risks and progress | Membership, Committees, Finance, Documents, Volunteer Service |
| 8 | Finance | Income/expense ledger, approvals, settlement, budgets and reporting | Dues, Projects, Events, Sponsorships |
| 9 | Welfare Support | Confidential welfare cases, assignment and resolution | Membership, Finance (restricted assistance), Complaints where appropriate |
| 10 | Complaints & Appeals | Complaint intake, review, decisions and appeals | Administration, Governance, Membership (restricted) |
| 11 | Documents & Reports | Private document register, access classification, archive and reports | All modules |
| 12 | Announcements & Notifications | In-app announcements and notification inbox; external delivery is a separate integration | Membership, Meetings, Elections, Projects, Administration |
| 13 | Administration & Security | Accounts, roles, permissions, settings and audit review | Platform-wide |

### Completion gaps already identified

- Consistent Hausa and Arabic translation across every module, including validation, dialogs, tables, exports and printable documents.
- Finance: approved budgets, period reporting, reconciliation and clearly separated approval/settlement.
- Communications: in-app notifications exist; email/SMS/WhatsApp delivery must be implemented and verified before being advertised as active.
- Documents: replacement/version history, retention and controlled access lifecycle.
- Welfare: full assignment/escalation and strict positive/negative access tests.
- Member Portal: fuller self-service workflows and verification.
- All modules: real-browser testing with both permitted and denied accounts; successful compilation alone is insufficient.

## 4. New capabilities: add as submodules first

The following capabilities are recommended. They should not all become top-level navigation entries immediately.

| Proposed capability | Recommended home | Scope and reason |
|---|---|---|
| Dues & Contributions | Finance + Membership | Member dues schedules, waivers, payment references, receipts, arrears and member ledger. Finance remains the accounting source of truth. |
| General Assembly & AGM | Meetings & Events | Notice, agenda, quorum, attendance, motions, resolutions, minutes and follow-up actions. Avoid a duplicate meetings system. |
| Constitution & Policies | Documents & Reports | Approved constitution, amendments, policy register, versions, effective dates and acknowledgement. |
| Annual Reports | Documents & Reports + Overview | Yearly membership, activities, finance and project summaries generated from approved records. |
| Risk Register | Projects & Development + Administration | Project-level risks stay in Projects; organisation-wide risks are governed by Administration. |
| Volunteer & Community Service | Projects & Development | Volunteer opportunities, sign-up, assignment, hours and verified service records. |
| Strategic Planning | Administration & Security | Goals, objectives, owners, measures, review dates and progress reporting. |
| Partnerships & Sponsorships | Finance + Projects | Partner register, sponsorship commitments, restrictions, deliverables and reconciled receipts. |

## 5. Optional dedicated modules (separate navigation only after approval)

| Module candidate | Why it may deserve a separate module | Dependencies |
|---|---|---|
| Branches & Chapters | Multiple local units with scoped officers, membership views, events and reporting | Membership, Leadership, RBAC |
| Alumni Management | Alumni status, contact preferences, engagement and alumni contributions without duplicating current membership | Membership, Dues, Communications |
| Training & Scholarships | Applications, eligibility, selection, attendance, awards and outcomes | Membership, Finance, Documents |
| Assets & Inventory | Asset register, custody, issue/return, maintenance and stock movements | Finance, Administration |
| Surveys & Member Feedback | Survey design, eligible audience, anonymous/identified response and analysis | Membership, Communications |
| Publications & Media Centre | Editorial workflow, approvals, publication archive and public/private distribution | Documents, Communications |
| Organisation-wide Risk & Compliance | Risk owners, controls, incidents, mitigation and review evidence | Administration, Projects |
| Dedicated Volunteer Centre | Only if volunteer operations grow beyond the Projects submodule | Membership, Projects |

**Decision gate:** promote a capability to a top-level module only when it has a distinct operational owner, unique data/workflow, clear permission boundary, and enough usage to justify separate navigation.

## 6. Data ownership and relationships

Use existing tables where they already represent the business entity. Do not create parallel tables just to match proposed menu labels.

| Domain | Existing database objects observed in the implementation status | Architectural ownership |
|---|---|---|
| Identity / access | `roles`, `permissions`, `role_permissions`, `aasa_audit_log` and account/profile records | Identity, grants and audit |
| Members / cards | `aasa_members`, `aasa_member_cards` | One member record; cards reference member |
| Governance | `aasa_positions`, `aasa_committees` | Position terms and committee assignments |
| Elections | `aasa_elections`, `aasa_secret_ballots`, `aasa_vote_receipts` | Ballots remain private; receipts never reveal vote choice |
| Meetings | `aasa_meetings`, `aasa_meeting_attendance` | Attendance references member and meeting |
| Projects | `aasa_projects`, `aasa_project_tasks` plus related milestone/risk/report records | Project is parent of team, milestones, tasks, risks and reports |
| Finance | `aasa_finance_entries`, `aasa_financial_approvals` | Ledger is source of truth; approvals are separate audit-able decisions |
| Welfare / complaints | `aasa_welfare_cases`, `aasa_complaints`, `aasa_complaint_appeals` | Separate confidentiality and access boundaries |
| Communications / documents | `aasa_notifications`, `aasa_announcements`, `aasa_documents` | In-app inbox, announcements and private document metadata |
| Configuration | `aasa_system_settings` | Controlled system settings |

The table list above is an architectural map, not a complete schema inventory. Before any migration, inspect the live schema, constraints, foreign keys, policies, grants and existing migration history. Proposed features such as dues, chapters or alumni must first be checked against existing tables to avoid duplication.

### Relationship rules

- Member is the canonical person record; account linkage is optional and must be verified.
- A member may have multiple historical cards, but only eligible/current cards may verify as active.
- Election candidate eligibility and voting eligibility derive from approved membership rules frozen for that election.
- Ballot identity is separated from vote choice; no admin interface may expose a member-to-choice mapping.
- Attendance, committee assignments, project teams and volunteer hours reference the canonical member.
- Finance entries retain source, reference, approver, settlement and supporting-document metadata.
- Welfare and complaint records have stricter access than ordinary member records; do not expose them through generic member search or exports.
- Documents use private storage and short-lived signed URLs; visibility labels alone are not authorization.

## 7. Navigation and dashboard structure

**Admin workspace**
- Overview
- Membership
- ID Centre
- Leadership & Committees
- Elections
- Meetings & Events (General Assembly/AGM as a sub-area)
- Projects & Development (Volunteer Service as a sub-area)
- Finance (Dues, Contributions, Budgets and Reconciliation as sub-areas)
- Welfare Support
- Complaints & Appeals
- Documents & Reports (Constitution, Policies and Annual Reports as sub-areas)
- Announcements & Notifications
- Administration & Security (Strategic Planning and organisation-wide risk as sub-areas)

**Member workspace**
- My Profile & Membership
- My ID Card
- My Dues & Receipts
- Meetings & Attendance
- Elections (only when eligible and open)
- My Project / Volunteer Tasks
- Announcements
- My Documents
- Welfare / Complaints entry points with privacy safeguards

Dashboards must show only counts and actions the signed-in user is authorised to see. Empty states should say there is no record yet; never insert fake rows to fill cards.

## 8. Integrations and operational services

| Service | Intended use | Required safeguards |
|---|---|---|
| Supabase Auth | OTP-based sign-in and session identity | Rate limits, expiry, resend cooldown, verified email and secure session handling |
| Supabase PostgreSQL + RLS | Source of truth | Least privilege, positive and negative tests, reviewed migrations |
| Supabase Storage | Private photos and documents | Private buckets, scoped policies, short-lived signed URLs, upload validation |
| Edge Functions | Trusted external integrations and public minimal verification | Input validation, secrets server-side, rate limits, audit logs |
| Email provider | Invitations, receipts and important notices | Consent/preferences, delivery logs, retries and templates in EN/HA/AR |
| SMS / WhatsApp provider | Optional time-sensitive alerts | Provider approval, cost controls, opt-in and delivery status |
| QR verification | Verify card authenticity/status | Return minimum public data; revoked/inactive cards must not expose private details |
| Export / print | CSV, PDF and ID card output | Permission checks, safe escaping, language/RTL support and audit where sensitive |

## 9. Security and privacy baseline

- Enable and test RLS for every table in exposed schemas; private schemas still require defence-in-depth.
- Review every SECURITY DEFINER function for caller identity, permission, row scope, fixed search path and EXECUTE grants. Do not remove intended RPCs or grant broad execution just to silence an advisor.
- Secret ballots and vote receipts remain inaccessible through direct client table access; only the minimum authorised aggregate result is exposed after closure.
- Separate create, review, approve and settle permissions for finance where practical.
- Restrict welfare, complaints, member photos and identity documents to assigned/authorised roles.
- Protect Super Admin bootstrap and prevent self-demotion/self-lockout.
- Use server-side validation for all privileged mutations; never trust frontend role flags or user-editable JWT metadata.
- Review leaked-password protection and sign-in policy in Supabase Auth.
- Run Supabase Security and Performance Advisors after schema/security changes; triage warnings rather than blindly applying fixes.
- Maintain backups, tested restore procedure, retention schedule and incident response process.

## 10. Delivery roadmap and acceptance gates

### Phase 0 — Baseline and release safety
- Reconcile README with the living implementation status.
- Inventory routes, components, tables, constraints, policies, functions, grants and storage buckets.
- Resolve the OTP length translation inconsistency: every language must consistently describe the actual six-digit verification code (unless the implementation is deliberately changed and tested).
- Establish a reproducible build, unit/security tests and a browser test account matrix.
- No feature work proceeds on an unverified assumption about existing schema.

### Phase 1 — Complete existing core workflows
- Membership and ID Centre end-to-end, including QR and revoked-card privacy.
- Leadership/committee appointment history and role scoping.
- Elections: manager vs results-reviewer separation, anonymous ballots and closed-result tests.
- Meetings, attendance, minutes and General Assembly/AGM sub-workflows.
- Finance approvals, budgets, settlement, reconciliation and period reports.
- Welfare and complaints restricted access and escalation.
- Documents versioning, replacement, retention and signed-link security.
- Consistent EN/HA/AR across admin and member workspaces.

### Phase 2 — Member value and operational extensions
- Dues & Contributions integrated with Membership and Finance.
- Member self-service portal.
- Volunteer service under Projects.
- Constitution/policy register and Annual Reports.
- Email delivery; SMS/WhatsApp only after provider, consent and cost decisions.

### Phase 3 — Organisational growth
- Chapters/branches and scoped chapter officers.
- Alumni engagement.
- Training/scholarships.
- Assets/inventory.
- Partnerships/sponsorships.
- Surveys/publications where there is a confirmed operational need.

### Phase 4 — Production readiness
- Offline/PWA and low-network behaviour.
- Backup/restore drill, monitoring, incident response and retention.
- Accessibility, mobile/desktop and RTL checks.
- Full end-to-end regression and permission-negative suite.
- Release checklist signed off; only then describe the platform as production-ready.

## 11. Definition of done for every module

A module is **Complete** only when all are true:

1. Requirements and authorised roles are documented.
2. UI works on mobile and desktop, with EN/HA/AR and RTL where relevant.
3. Data model reuses canonical entities and has reviewed constraints/indexes.
4. RLS, grants and trusted functions enforce the permission model.
5. Create/read/update/archive/export paths work with real authorised accounts.
6. Unauthorised users are denied; cross-member and cross-role access is tested.
7. Audit events are recorded for sensitive changes.
8. Empty, loading, validation, network and error states are handled.
9. Browser workflow and regression tests pass against the deployed build.
10. Documentation and implementation status are updated with evidence.

## 12. Immediate execution order

1. Reconcile documentation and confirm the default branch/build baseline.
2. Fix and test the OTP copy consistency in Hausa, English and Arabic.
3. Run a module-by-module source/database matrix, marking each item **Implemented**, **Partially implemented**, **Not implemented**, or **Blocked** with evidence.
4. Choose the first core release blockers from that matrix; do not create new tables until schema reuse and access boundaries are reviewed.
5. Implement one bounded workflow at a time, then run build, database checks and browser positive/negative tests before moving on.

**Current status:** Architecture baseline drafted. No database schema or production data has been changed by this document.
