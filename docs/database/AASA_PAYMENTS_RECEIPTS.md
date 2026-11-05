# AASA Payments & Receipts

This workspace is a standalone operational module. It does not reuse or write to the Finance Ledger (`aasa_finance_entries`) or Dues & Contributions (`aasa_dues`).

## Database objects

- `aasa_payment_obligations`: amount owed by one active AASA member for a stated purpose.
- `aasa_payments`: each payment received against an obligation. Multiple rows support partial payments.
- `aasa_receipts`: one unique receipt per payment, with a unique QR token and void metadata.
- `aasa_payment_audit_logs`: append-only operational event history.

All four tables have RLS enabled. Authenticated users have read-only table grants where permitted. Mutations are performed through permission-checked database functions, not direct browser table writes.

## Database functions

- `aasa_create_payment_obligation`: creates an obligation for an active, non-test member.
- `aasa_record_member_payment`: locks the obligation, rejects overpayments, records the payment, issues a unique receipt number and QR token, updates settled status, and records an audit event in one transaction.
- `aasa_list_payment_members` and `aasa_list_payment_obligations`: return only the limited fields needed by the Payments workspace.
- `aasa_verify_payment_receipt`: QR-token verification with a limited receipt response. It does not expose member contact or location details.

## Permissions

- `payments.read`
- `payments.create`
- `payments.obligations.manage`
- `payments.audit.read`
- `receipts.read`
- `receipts.verify`

The Financial Secretary and Treasurer receive payment read/create/obligation management and receipt read permissions. The Auditor receives payment read, audit read and receipt read. Super Admin is authorised by the existing central RBAC helper.

## Payment lifecycle

An obligation is outstanding until payments cover part or all of the amount due. A payment smaller than the outstanding balance leaves the obligation open and visible as partially paid. When the outstanding balance reaches zero, the obligation becomes settled. Every accepted payment receives its own receipt.

Receipt numbers use the format `AASA-RCP-YYYY-0000001`. QR codes contain the unique receipt verification token. No sample payment or obligation rows are seeded.
