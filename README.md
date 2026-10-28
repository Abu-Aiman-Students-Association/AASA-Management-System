# AASA Management System

Abu-Aiman Students' Association (AASA) — a secure, multilingual, mobile-first association management platform.

## Current implementation status

- React + TypeScript + Vite frontend.
- Supabase is the chosen backend for Auth and PostgreSQL; the project moved away from Appwrite after implementation problems.
- Current database foundation includes profiles, roles, permissions, role_permissions, user_roles, audit_events, and a private Super Admin bootstrap record.
- The administration dashboard and server-side account authorization foundation exist.
- Membership, leadership/committees, elections, meetings/events, finance, welfare/cases, and documents/reports must be treated as planned until each workflow is implemented and verified end-to-end. A navigation item is not proof that a module is live.

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
- Privileged operations must verify the authenticated identity and the required database role/permission, then create an audit event.
- Do not create broad public read/write access for private association records.
- Secret elections require a separate threat model and end-to-end security review before real ballots.
- Preserve existing data during schema changes; use reviewed migrations and verify positive and negative authorization cases.

## Security checks

Review Supabase Security Advisor and Auth settings regularly. The advisor has reported the private bootstrap table as RLS-enabled without policies (review this in the context of its private schema and grants), and leaked-password protection as disabled. Enable leaked-password protection in Supabase Auth settings after confirming the project's sign-in policy. Do not add a client-accessible policy to the private bootstrap table merely to silence the advisor.

## CI and deployment

GitHub Actions currently builds the application, runs server authorization security tests, and deploys the Pages artifact. A successful run proves only the checks included in that run; it does not prove every business module or database authorization path is complete.

## Data integrity

- Never present fabricated members, ballots, cases, or financial transactions as real data.
- Keep test records explicitly labelled and remove them only after confirming they are test-only.
- Never claim a service or module is complete without a reproducible test.
