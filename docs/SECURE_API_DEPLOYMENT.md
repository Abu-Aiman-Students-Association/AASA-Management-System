# AASA secure API deployment

This API is a server-side authorization foundation. Do not expose live mutations until the acceptance tests below pass in the actual Appwrite function runtime.

## Appwrite function

- Function ID: create a new function named `AASA Authorized API` (do not overwrite the existing audit function).
- Runtime: Node.js 26.
- Entrypoint: `src/main.js` (deploy the contents of `functions/aasa-api` as the function root).
- Endpoint routes: `/health`, `/members`, `/members/{rowId}`, `/members/{rowId}/archive`, `/meetings`, `/finance`, and `/elections`.
- Required server environment variables: `APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1`, `APPWRITE_PROJECT_ID=6adbc96b002527d3b7fc`, `APPWRITE_API_KEY`, and `AASA_DATABASE_ID=6adc732d002ef31e6c3a`.
- Keep `APPWRITE_API_KEY` only in the function's server-side variables. Never add it to `VITE_*`, browser code, Git, or a public build log.
- Start with minimum server API key scopes needed for account-independent table reads/writes; reduce further after testing. Do not grant user-management or storage scopes unless a tested requirement needs them.
- Limit function execution to authenticated AASA users; the handler independently verifies the Appwrite user JWT through `GET /account` and derives actor ID from that verified response.

## Permission mapping

| Resource | Read | Create | Update | Archive |
|---|---|---|---|---|
| Members | `members.read` | `members.create` | `members.update` | `members.archive` |
| Meetings | `meetings.manage` | `meetings.manage` | `meetings.manage` | Not exposed |
| Finance | `finance.read` | `finance.record` | `finance.record` | Not exposed |
| Elections | `elections.manage` | `elections.manage` | `elections.manage` | Not exposed |

All writes use server-derived audit actor IDs. Caller-supplied actor, approval, test-record, and system fields are discarded. Members are created as `PENDING_VERIFICATION`; financial transactions start as `SUBMITTED`; elections and meetings start as `DRAFT`. Election voting and financial approval are deliberately not exposed by this initial API until their full workflow and invariants are separately tested.

## Required acceptance tests before production

1. No JWT: every protected route returns HTTP 401.
2. Invalid/expired JWT: HTTP 401.
3. Valid account with no active role assignment: no protected module permission; HTTP 403.
4. Revoked or expired role assignment: HTTP 403.
5. Role with `members.read` only can read members but cannot create, update, or archive.
6. Role without `finance.record` cannot create a transaction, even if it manually calls the endpoint.
7. Supplying `actor_user_id`, `recorded_by`, `approved_by`, `is_test_record`, or privileged member status in the body cannot spoof server-managed fields.
8. Every permitted mutation creates an audit event whose actor matches the identity verified by Appwrite.
9. If the audit write fails, the mutation must not be reported as successful; validate the function's write ordering and consider a transactional outbox before production.
10. Confirm all routes and TablesDB endpoint/query syntax against the deployed Appwrite runtime. Keep live writes disabled until these pass.

## Current status

Source committed in the repository is not the same as a deployed or verified function. A project owner must configure the function's secret API key and deploy it in Appwrite. The existing `AASA Secure Audit V2` function is left untouched.
