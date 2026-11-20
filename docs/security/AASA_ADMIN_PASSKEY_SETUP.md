# AASA administrator passkey setup

AASA administrator sign-in supports both the existing email OTP flow and Supabase Auth WebAuthn passkeys.

## Client requirements

- `@supabase/supabase-js` must be version `2.105.0` or later.
- The client opts in with `auth.experimental.passkey: true`.
- Passkey registration is available only after an administrator has authenticated and the database confirms the selected portal role.
- Passkey sign-in does not bypass the existing profile status, role, permission, or portal-isolation checks.

## Enable passkeys in Supabase

In the AASA Supabase project, open **Authentication → Passkeys** and enable passkey authentication.

Configure:

- **Relying Party Display Name:** Abu-Aiman Students' Association
- **Relying Party ID:** the bare, permanent AASA hostname (no scheme, port, or path)
- **Relying Party Origins:** the exact HTTPS origin(s) that serve AASA, with no path

WebAuthn requires HTTPS, except for localhost development. The origin hostname must match the RP ID or be its subdomain. Supabase supports up to five allowed origins.

## Temporary preview warning

Do not register a long-term administrator passkey on an expiring preview hostname. Passkeys are cryptographically bound to their RP ID. Changing the RP ID later invalidates credentials enrolled under the old RP ID.

For a temporary-only end-to-end test, the temporary hostname can be configured as the RP ID and origin, but any passkey enrolled there must be treated as disposable and removed before the preview expires. For permanent administrator passkeys, wait until the final stable AASA domain is selected and configure that stable RP ID first.

## Safe test sequence

1. Verify Super Admin and Association Admin email OTP sign-in separately.
2. Confirm each account is accepted only by its matching portal role.
3. Enable the correct HTTPS origin and RP ID before testing a passkey ceremony.
4. Register a disposable test passkey only if using a temporary RP ID.
5. Sign out, sign in with that passkey, and confirm the same server-side role checks still run.
6. Remove the disposable credential and restore the intended stable RP configuration before production use.

Never put a Supabase secret/service-role key in browser code. Passkey private keys remain with the user's authenticator; Supabase stores the public credential material.
