# AASA Management System

Abu-Aiman Students' Association (AASA) — a secure, multilingual, offline-conscious association management platform.

## Current foundation

- React + TypeScript + Vite frontend
- Appwrite Web SDK client configured for the existing AASA Appwrite project
- A connection-check screen that reports success or the actual error
- Responsive starter dashboard; planned modules are clearly marked as planned, not live features

## Local development

1. Install Node.js (current LTS) and pnpm or npm.
2. Copy `.env.example` to `.env.local`.
3. Confirm the Appwrite endpoint and project ID in `.env.local`.
4. Install dependencies with `npm install` (or `pnpm install`).
5. Start the app with `npm run dev` (or `pnpm dev`).

The environment variables are public client configuration only. **Never place Appwrite API keys or other server secrets in a browser app or commit them to GitHub.**

## Appwrite status

The project and web app have been registered in Appwrite. Runtime connectivity still needs to be tested from the running app. A successful ping verifies endpoint connectivity only; it does not configure authentication, database collections, permissions, backups, or production deployment.

## Security and data integrity

- Do not use fabricated people or transactions as real data.
- Implement and test access controls before exposing private association records.
- Configure Appwrite database permissions and authentication deliberately before adding live data.
- Keep secrets out of source control and client-side environment variables.
