# Awelion HR Workspace — implementation and safety notes

## Scope of this branch

This is an **opt-in** HR workspace served at `/hr-suite/`, using live `/api/hr-suite/*` APIs and real employee records. Existing CRM/Leads/Projects/Accounts pages and the original root frontend remain intact while the new workspace is reviewed. No dummy employee names are included in the new UI.

New features:
- Employee punch events: Check IN, Lunch OUT, Lunch IN, Check OUT (server-side IST timestamps) with repeated-action and archived-user protection.
- Employee and HR monthly attendance views, computed net work time (excluding completed lunch intervals), late IN, early OUT, long lunch and short-hours observations.
- Provisional discipline point summaries; **never automatically fine employees or deduct salary**.
- Employee profile self-service and percentage completeness (bank changes require a separate Admin verification process before payroll use).
- Owner/Admin manual historical leave data (Apr–Sep 2026) and 1.5-day paid allowance / LOP; eligibility `NA` retained.
- Owner/Admin October 1, 2026 opening leave balances; deterministic future earned leave with 1.5 days/month.
- Effective-dated salary revisions and draft payroll calculations using actual calendar days.
- Owner/Admin-only salary and payroll endpoints in the new suite; existing endpoints require permission hardening before go-live.

## Not included / not claimed as complete

- No salary slips are issued, marked paid, or downloaded; the UI shows draft calculations only.
- Existing legacy React UI is not replaced; it remains reachable at `/`.
- Automatic salary deduction for penalties and bonus payouts is not enabled.
- Late/early, short hours and missing punches are provisional flags, not confirmed misconduct.
- Earlier months without attendance events cannot be reconstructed from leave totals; dates remain unspecified.
- Existing initial/test employee records are **not deleted**. If they exist in the database, archive them after identifying them from actual employee IDs.
- Team/HR salary visibility from **legacy routes** must be regression-tested after the companion permission patch.
- Future leave balance requires Admin confirmation of the opening balance. Cross-boundary leave, holiday exclusion and partially eligible joiners need manual reconciliation.

## Required deployment checklist (NOT automatic)

1. Confirm the branch has no credentials, private keys, `.env`, payroll exports or PII.
2. Take a private, restorable MySQL backup **outside public_html and repository**. Check record counts and file integrity.
3. Clone to a staging Hostinger Node.js instance + restored staging DB, with different credentials.
4. Review `migrations/2026_11_12_hr_suite.sql` and apply to staging DB first; the SQL only adds new `hrx_` tables, with no `DROP` or changes to existing schemas.
5. Test role permissions with real Owner, HR and Employee test logins; verify HR cannot read salary from any legacy or new route.
6. Match employee IDs, manually enter historical monthly leaves (April–September) and actual opening balances. Do **not** auto-import based on names.
7. Verify month-wise salary rates, salary preview, leave balance, holiday exemptions and archival filters; compare to existing records.
8. Obtain Owner approval; only then perform the backed-up additive migration and app deploy to production.
9. Do not run `npm run build` on the original compiled React tree. This new portal uses plain HTML/CSS/JS and does not require a build command.

## Data separation

Existing `users`, `employees`, `employee_details`, `attendance`, `leave_requests`, `payroll` remain intact. `hrx_punch_events`, `hrx_historical_leave`, `hrx_leave_opening`, `hrx_salary_revision`, and `hrx_audit_log` are additive. New attendance punch operations update the existing daily attendance row and an event log together in one database transaction.

## Test commands

```bash
node --check nodejs/routes/hrSuite.js
node --check nodejs/lib/hrLogic.js
node --check nodejs/public/hr-suite/app.js
node --test nodejs/tests/hrLogic.test.js
```

## Historical leave source (not auto-imported)

Owner-provided historical leave data is **not included in this public repository**. Store the original historical leave records privately and enter them by employee ID through Admin screens. NA means not employed or not eligible. Original May for Vishva (`.1.5`) was normalized to 1.5 days after prior confirmation. Use the internal Admin UI and real employee IDs for import.