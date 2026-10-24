# AASA Master Blueprint v1.0 — Database and Permissions Gap Review

Status: Review findings; no Appwrite configuration changed
Authority: `AASA_Master_Blueprint_v1.0.pdf` (Requirements Baseline, 23 October 2026)
Repository: `Abu-Aiman-Students-Association/AASA-Management-System`

## 1. Executive finding

The current `INITIAL_SCHEMA_PLAN.md` and `ROLE_PERMISSION_MATRIX.md` are useful starting proposals, but they are not a complete implementation design for the approved Master Blueprint. Do not apply them to production as-is. The blueprint explicitly requires the complete database schema, permission matrix and migration plan to be defined before implementation.

## 2. Blueprint requirements that must be represented

The initial schema proposal currently covers only member profiles, role assignments, audit events, future meeting records, future finance transactions and future membership applications. The full design must also account for:

- Authentication accounts kept separate from membership records; account creation/linking, suspension/reactivation and recovery.
- Membership registry, application review, membership statuses, unique member IDs/numbers, authorised photographs/documents, QR cards and QR verification, authorised imports/exports.
- Executive positions, office terms, appointments, delegated access, executive handover and accountability.
- Committees, committee memberships, tasks, activities and committee reports.
- Elections, election configuration, candidate applications, voter eligibility, secret ballots, duplicate-vote prevention, results, result approval/publication and election complaints. Ballot secrecy must not be undermined by administrator or election-officer access.
- Meetings, attendance, agendas, minutes, resolutions, events and calendars.
- Announcements, personal notifications and supported integrations.
- Financial accounts/categories, contributions, income, expenses, budgets, supporting documents/receipts, approvals, reconciliation, corrections/reversals and reports. Enforce separation of duties; do not permit silent self-approval or concealment.
- Welfare cases with additional restrictions, complaints and suggestions with confidentiality controls.
- Projects, documents, archives and retention/access rules.
- Reports, authorised exports, association settings, audit events, backup/recovery operations and system configuration.
- PWA/offline drafts and controlled synchronisation where relevant, with conflict and privacy handling.

## 3. Permission matrix gaps

The draft roles do not yet fully represent the named responsibilities in the blueprint, including President/association leadership, Secretary General, Assistant Secretary, Financial Secretary, Treasurer, Public Relations Officer, Welfare Officer, Committee Chairperson, Committee Member and ordinary member. These must be mapped to actual approved governance roles; do not silently replace the association's named offices with generic roles.

The final matrix must define per-resource actions (create/read/update/delete/approve/publish/export/assign/revoke), ownership, scope, delegated/temporary access, sensitive fields, approval separation and audit requirements. It must include account-to-member linking, immediate revocation where appropriate, least privilege and deny-by-default enforcement on the backend. Frontend hiding is not authorization.

Special restrictions:
- Finance: separate transaction preparation, approval, treasury processing and audit according to approved policy.
- Welfare/complaints: only specifically authorised roles may access case details.
- Elections: election officers must not have unrestricted access to identifiable secret ballots; separate ballot secrecy threat model and integrity/privacy tests are required.
- Audit: protected against unauthorised changes; auditors can review but must not silently alter audited records.
- Ordinary members: access only their own permitted data and published association information, not other members' confidential records.
- System/service identity: narrowly scoped server-side privileges, never shared as a human account.

## 4. Schema and implementation controls required before Appwrite setup

1. Produce a complete entity/data dictionary with fields, types, required/optional status, validation, relationships, indexes, uniqueness rules and retention.
2. Specify Appwrite database/collection/document permission design and explain where trusted Appwrite Functions are required. The blueprint mentions relational concepts and row-level security; adapt those controls carefully to Appwrite's actual document-permission model rather than claiming SQL RLS exists in Appwrite.
3. Define versioned, reviewed migrations. Test on development/test resources before production; destructive changes require explicit authorisation and a recovery plan.
4. Use minimal personal data, strict file upload constraints, and no secrets in frontend code or GitHub.
5. Make privileged changes auditable: account/role changes, membership approval, appointments, election configuration, financial approvals/adjustments, sensitive document access where justified, result publication, settings, backup and recovery.
6. Document backup coverage, frequency, retention, export and costs; successfully test restoration rather than assuming backups work.
7. Test allowed and denied operations with ordinary member and relevant officer/admin accounts, including attempts to access another member's data and to self-assign privileges.
8. Keep all test records clearly labelled and separate from production records. Do not fabricate production members, payments or elections.
9. Preserve existing data; no destructive migration without authorisation and a recovery plan.
10. Track status accurately: Planned, In development, Implemented, Tested, Verified, Deployed and Production-ready are distinct.

## 5. Required design documents before implementation

- Complete database schema/data dictionary and relationship map.
- Final role-to-office mapping and permission matrix.
- Election secrecy and integrity threat model.
- Financial workflow and separation-of-duties rules.
- Welfare/complaints confidentiality and document access rules.
- Versioned migration/rollback plan.
- Test plan covering positive and negative permissions, mobile/slow network/offline cases, financial reconciliation, election integrity and recovery.
- Backup, restoration, incident response and maintenance procedures.

## 6. Current verified status

- Appwrite project and frontend connection check were previously verified.
- Authentication login and logout UI were implemented and deployed.
- Appwrite database collections, production permissions, storage buckets and trusted server-side functions have not been established by the work recorded here.
- The two existing design documents are proposals, not active Appwrite configuration.
- This review does not itself configure Appwrite or establish production readiness.

## 7. Recommended next step

Revise the schema proposal and permission matrix against this checklist, then review the exact field-level schema and role-to-office mapping before creating any Appwrite collections or permissions. Keep the Master Blueprint as the controlling requirements document and record any approved deviations explicitly.
