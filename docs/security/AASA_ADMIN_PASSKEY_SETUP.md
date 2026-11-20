# AASA administrator authentication setup

The permanent AASA web address is the GitHub Pages site:

- Application URL: `https://abu-aiman-students-association.github.io/AASA-Management-System/`
- WebAuthn relying-party ID: `abu-aiman-students-association.github.io`
- WebAuthn allowed origin: `https://abu-aiman-students-association.github.io`

The origin and RP ID must not include the repository path, trailing slash, scheme in the RP ID, or query string.

## Email OTP configuration

In the AASA Supabase project (`pedmroseihpaflbzqgkf`):

1. Open **Authentication → Providers → Email** and ensure email sign-in is enabled.
2. Set the email OTP length to **8 digits**, because the AASA administrator login validates an 8-digit code.
3. Set a reasonable OTP expiry (for example, 10 minutes).
4. Open **Authentication → Email Templates → Magic Link** and ensure the email visibly includes the one-time code using `{{ .Token }}`. The app expects the numeric code; a link-only template is not sufficient.
5. Save the settings and send a test OTP to an already-created, authorised administrator account.

The application calls `signInWithOtp` with `shouldCreateUser: false`, so the login form does not create new administrator accounts. Only existing accounts with an active, database-assigned role can enter the corresponding portal.

## Passkey configuration

Supabase Auth passkeys are experimental and must be enabled in **Authentication → Passkeys**.

Configure:

- **Relying Party Display Name:** Abu-Aiman Students' Association
- **Relying Party ID:** `abu-aiman-students-association.github.io`
- **Relying Party Origins:** `https://abu-aiman-students-association.github.io`

The site must be served over HTTPS. Do not use a temporary preview hostname: passkeys are cryptographically bound to the RP ID, and changing it later invalidates credentials registered under the previous RP ID.

## Safe verification sequence

1. Open the permanent AASA GitHub Pages application URL.
2. Test email OTP separately for the designated Super Admin and an existing Association Admin account.
3. Confirm Super Admin is rejected by the Association Admin portal and vice versa.
4. After OTP succeeds, register a passkey for each authorised administrator on their own device.
5. Sign out, then test passkey sign-in in the correct portal.
6. Confirm the database profile status, role, expiry, and permissions are still checked after either sign-in method.

Never put a Supabase secret/service-role key in browser code. Passkey private keys remain with the user's authenticator; Supabase stores public credential material.
