# AASA Management System

Abu-Aiman Students' Association (AASA) — a secure, multilingual, mobile-first association management platform.

## Current implementation status

- React + TypeScript + Vite frontend.
- Supabase is the selected backend for Auth, PostgreSQL, Row Level Security and private Storage.
- The administration workspace contains 13 module areas. Their implementation and remaining verification work are tracked in [MASTER_BLUEPRINT_IMPLEMENTATION_STATUS.md](docs/MASTER_BLUEPRINT_IMPLEMENTATION_STATUS.md).
- The product architecture and strict module ownership rules are documented in [AASA_MASTER_MODULE_ARCHITECTURE.md](docs/AASA_MASTER_MODULE_ARCHITECTURE.md).
- A module appearing in navigation or having a component does not by itself mean its complete workflow is production-ready; use the implementation status and acceptance tests as the source of truth.
- Module boundary rule: each module owns its own business actions, writes, lifecycle and audit trail. Other modules may use permission-limited read-only references or open the owning module, but must not take over its work. Overview is read-only aggregation only.
- Membership registration and approval belong only to Membership. Identity-card issue, print and revocation belong only to ID Centre.

## Local development

1. Install a supported Node.js LTS version and npm.
2. Copy `.env.example` to `.env.local`.
3. Set the Supabase project URL and publishable/anon client key.
4. Install dependencies with `npm install`.
5. Start with `npm run dev`; run `npm run build` before submitting changes.

Only public client configuration belongs in `VITE_*` variables. Never put a Supabase service-role key, database password, or other server secret in browser code or GitHub.

## Database and authorization

- Supabase Auth identifies users; PostgreSQL Row Level Security (RLS) and trusted database functions enforce access.
- Treat frontend route guards as presentation only, never as the security boundary.
- Privileged operations must verify the authenticated identity, required permission and record scope, then create an audit event.
- Do not create broad public read/write access for private association records.
- Secret elections require a separate threat model and end-to-end security review before real ballots.
- Preserve existing data during schema changes; use reviewed migrations and verify positive and negative authorization cases.
- A shared database does not grant modules permission to mutate one another's records. Each table, storage namespace and privileged RPC must have a documented owner.

## Security checks

Review Supabase Security Advisor and Auth settings regularly. Previously observed findings include RLS-enabled tables without direct policies (which may be intentional for private/internal tables and must be checked against grants and trusted RPCs) and leaked-password protection disabled. Review current Auth settings and enable appropriate protections after confirming the OTP-first sign-in policy. Do not add client-accessible policies merely to silence an advisor warning.

## CI and deployment

GitHub Actions builds the application, runs the configured security checks and deploys the Pages artifact. A successful run proves only the checks included in that run; it does not prove every business module or database authorization path is complete.

## Data integrity

- Never present fabricated members, ballots, cases or financial transactions as real data.
- Keep test records explicitly labelled and remove them only after confirming they are test-only.
- Never claim a service or module is complete without a reproducible test.
