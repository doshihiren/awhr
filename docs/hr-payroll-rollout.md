# HR payroll preview — FY 2026–27

This branch is a **read-only first increment**, not the completed HR overhaul.

Endpoints (authenticated):
- `GET /api/hr-preview/historical-leaves` — owner/HR, 36 rows, including 5 ineligible months as null; no matching to live employee IDs.
- `POST /api/hr-preview/historical-payroll-preview` — owner only, accepts JSON `{"salary":12000,"leave":3,"paidLeave":1.5,"month":4,"year":2026,"otherDeductions":0}`; returns LOP and net using actual calendar days.

No database schema modifications, employee-role updates, attendance writes, or payroll writes are performed. **Do not interpret these preview results as finalized payroll.**

Before any import:
1. Take and verify a private MySQL backup outside the public web root.
2. Review live schema, employee IDs, and existing leave/payroll records in a nonproduction copy.
3. Add versioned additive migrations and a migration tracking table.
4. Import with a dry run, employee ID matching, idempotency keys, and a transaction; preserve NA as ineligible.
5. Record approved opening balances as of October 2026, separately from past monthly paid leave/LOP.
6. Obtain owner approval before finalization or any live database writes.

The React frontend source is not yet available in the repository. Compiled assets must not be manually edited to implement production UI.
