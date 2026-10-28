# AASA administrator/profile privilege hardening

Applied to Supabase project `pedmroseihpaflbzqgkf` as migration
`aasa_admin_profile_privilege_hardening` on 2026-10-28.

The change:
- Revokes direct table privileges from anonymous clients on core identity, RBAC, and audit tables.
- Limits signed-in clients to SELECT on those tables, subject to existing row-level security policies.
- Allows signed-in users to update only `profiles.full_name` and `profiles.preferred_language`; `account_status` and `user_id` cannot be changed by the profile owner through direct table updates.
- Restricts the three public administration/bootstrap RPC entry points to authenticated users.

Verification after applying:
- Permanent Super Admin remains active and retains the `super_admin` role.
- Authenticated table grants are SELECT-only for core tables.
- Profile UPDATE grants are limited to `full_name` and `preferred_language`.
- Anonymous core-table grants are absent.

This SQL is a record of the production change; the repository currently does not contain a Supabase CLI `supabase/migrations` directory.
