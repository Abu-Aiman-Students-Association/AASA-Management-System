# AASA Role and Permission Matrix — Initial Proposal

Status: Draft for owner review — not active authorization
Security principle: deny by default; backend-enforced least privilege.

## Roles proposed
- Association Admin: manages approved association configuration and assigns roles only through an authorized workflow.
- Membership Officer: reviews membership applications and maintains approved membership records.
- Finance Officer: prepares financial records and supporting documents; approval authority is separate where required.
- Secretary: manages meetings, minutes, notices, and official documents within policy.
- Committee Officer: accesses only assigned committee resources.
- Election Officer: configures election workflows only after separate security review; must not access secret ballot-to-voter links.
- Auditor: read-only access to authorized audit and financial records.
- Ordinary Member: accesses own profile and information explicitly published to members.
- System/service identity: minimal server-side privileges, never used as a shared human login.

## Permission matrix (proposed)

| Resource/action | Association Admin | Membership Officer | Finance Officer | Secretary | Committee Officer | Election Officer | Auditor | Ordinary Member |
|---|---|---|---|---|---|---|---|---|
| Association settings | Manage | No | No | Limited | No | No | Read approved audit scope | Read published |
| Membership applications | Manage/review | Review | No | No | No | No | Read authorized audit only | Submit/read own through approved flow |
| Membership ID cards (ID Center) | Issue/revoke with audit | Issue/revoke only when explicitly granted | No | No | No | No | Read authorized audit only | View own verified card only |
| Member profiles | Manage with audit | Manage assigned duties | Minimum required fields only | Minimum required fields only | Assigned scope only | Eligibility data only | Read authorized scope | Read own permitted fields |
| Role assignments | Grant/revoke through trusted workflow | No | No | No | No | No | Read audit trail | No |
| Meetings/minutes | Manage | No | No | Manage | Assigned committee only | No | Read authorized audit scope | Read published records |
| Finance transactions | Oversight per policy | No | Create/update drafts | No | No | No | Read-only authorized scope | Own receipts only if implemented |
| Finance approval | Only if independent approval policy permits | No | Not own transactions where separation applies | No | No | No | Read-only | No |
| Audit events | Restricted read; no client edits | No direct edit | No direct edit | No direct edit | No direct edit | No direct edit | Read-only | No |
| Elections | Configuration oversight under separate reviewed workflow | No | No | Limited published notices | No | Manage approved setup; no ballot linkage | Audit approved events | Vote only when eligible and election open |
| Project proposals, teams, milestones, tasks and risk register | Manage | Manage | Manage | Assigned project scope only | No | No | Read authorised audit scope | Assigned tasks only; update own task through guarded workflow |
| Project budget and completion approval | Approve | No | No | No | No | No | Read authorised audit scope | No |

## Mandatory enforcement
1. The frontend must not decide authorization by itself.
2. Never accept a role supplied by a browser as proof of authority.
3. Supabase PostgreSQL grants and Row Level Security (RLS) policies must enforce access to data.
4. Privileged changes should use trusted server-side operations with explicit role checks and audit events.
5. No ordinary user may assign themselves roles or modify audit records.
6. Sensitive personal data must be minimized and scoped.
7. Election ballot secrecy requires a separate threat model and testing before any real election.
8. Test both positive and negative cases: authorized action succeeds; unauthorized action is denied.
9. Never use a broad public read/write permission for private association collections.
10. Review all final roles and actions against the approved AASA Master Blueprint before implementation.

## Approval required
This is a design proposal only. Do not create Supabase roles, tables, records, or production policies solely from this draft. The association owner must confirm role names, role assignment authority, and separation-of-duties rules first.


## Current Projects permission implementation

The current database grants `projects.manage` to `association_admin`, `president` and `vice_president`; `projects.approve` is granted only to `association_admin`. Super Admin retains the platform-level override. Assigned active project members can read their assigned project task records and update only their own assigned tasks through a server-side function; they do not receive project budget or approval fields. This implementation is narrower than a general committee-wide project permission and must be reflected in future role reviews.
