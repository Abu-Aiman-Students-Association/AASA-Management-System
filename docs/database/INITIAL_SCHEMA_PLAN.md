# AASA Initial Database Schema Plan

Status: Design proposal — not yet applied to Appwrite
Project: AASA Management System
Purpose: Review the data model before creating production collections.

## Safety rules
- Do not create collections or production records from this document alone.
- Deny access by default. Grant access only after the role and resource rules are implemented and tested.
- Do not rely on hidden UI controls as authorization.
- Keep secrets, passwords, session tokens, and API keys out of documents and logs.
- Use server-side trusted operations for sensitive approvals, financial posting, and secret election workflows.
- Use test-only data until the owner approves the schema and permissions.

## Proposed collections

### 1. member_profiles
One association-member profile per approved membership record.
- user_id: string; Appwrite Auth user ID; unique where supported
- membership_number: string; unique; assigned through an approved workflow
- full_name: string
- email: string, optional
- phone: string, optional
- status: enum proposed: pending, active, suspended, expired, rejected
- joined_at: datetime, optional
- created_at, updated_at: datetime
- created_by, updated_by: user IDs
Permissions: member can read only their own permitted profile fields; membership officers can read/manage within assigned duties; public access prohibited.

### 2. role_assignments
Role assignments are separate from member profile data.
- user_id: string
- role: enum proposed: association_admin, membership_officer, finance_officer, secretary, committee_officer, ordinary_member, auditor, election_officer
- scope: enum proposed: association, committee, finance, election; use only where approved
- scope_id: string, optional
- status: enum proposed: active, revoked
- starts_at, ends_at: datetime, optional
- granted_by: user ID
- created_at, updated_at: datetime
Permissions: never allow a user to grant themselves a role. Changes require trusted, authorized administration and an audit event. Do not treat a client-written role field as proof of authorization.

### 3. audit_events
Append-only record of important administrative and security actions.
- actor_user_id: string, optional for system events
- action: string
- resource_type: string
- resource_id: string, optional
- outcome: enum proposed: success, denied, failure
- occurred_at: datetime
- correlation_id: string, optional
- metadata: object containing only minimal non-sensitive details
Permissions: no ordinary member writes or deletes; restricted read access for authorized auditors/admins. Prefer trusted server-side writes for privileged actions.

### 4. meeting_records (later phase)
- title, description, location, starts_at, ends_at
- status: draft, scheduled, completed, cancelled
- created_by, created_at, updated_at
Permissions: read according to association policy; editing limited to authorized meeting/secretariat roles.

### 5. finance_transactions (later phase; do not enable until finance controls are reviewed)
- transaction_reference: string, unique
- transaction_type: income or expenditure
- amount_kobo: integer, positive
- currency: NGN
- category: string
- description: string
- status: draft, pending_approval, approved, rejected, reversed
- created_by, approved_by, created_at, approved_at
- supporting_document_id: optional storage reference
Permissions: restricted to finance roles and designated approvers. Separate duties; prevent self-approval when policy requires independent approval. Use trusted server-side validation and immutable audit history.

### 6. membership_applications (later phase)
- applicant details needed for review only
- submitted_at, status, reviewed_by, reviewed_at, decision_reason
Permissions: applicants may submit/read only their own application through an approved flow; officers can review according to role. Avoid collecting unnecessary sensitive data.

## Indexes and integrity
Before implementation, identify required unique indexes for user_id, membership_number, and transaction_reference. Verify Appwrite's current index and constraint behavior before relying on it. Validate relationships in trusted workflows.

## Migration and rollout order
1. Review and approve the role-permission matrix.
2. Confirm exact membership and governance requirements from the approved AASA Master Blueprint.
3. Create a development/test database and collections only after approval.
4. Add attributes and indexes; wait for them to become available.
5. Configure collection/document permissions to deny by default.
6. Implement trusted server-side role checks and audit events.
7. Test allowed and denied cases with at least an ordinary member, an officer, and an administrator.
8. Only then approve production use and import verified data.

## Open decisions before implementation
- Official membership number format and assignment authority.
- Whether profiles may contain guardian/emergency contacts and who may see them.
- Final role names and scopes from the approved AASA governance rules.
- Meeting, committee, election, welfare, complaints, and document retention requirements.
- Which actions require two-person approval.
