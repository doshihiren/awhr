# AWHR — Employee Salary & Payroll Management System

Production-ready Laravel 12 payroll application for salary calculation, attendance, leave, and payroll processing.

## Stack

- **Laravel 12** + MySQL
- **Bootstrap 5** + jQuery + DataTables + Chart.js
- DomPDF (payslips / Form 16)
- Maatwebsite Excel (exports)
- Spatie Laravel Permission (future role support)

## Features

- Dashboard (headcount, payroll, leave liability, birthdays, charts)
- Employee master with configurable salary structure (Basic 50% / HRA 40% / Other 10%)
- Attendance entry with automatic salary proration
- Leave management (FY Apr–Mar, 18 leaves/year, 1.5 accrual/month)
- Professional tax (configurable; default ₹200 when salary ≥ ₹12,000)
- Payroll workflow: draft → calculated → frozen → approved → locked
- PDF payslips, Form 16, reports, bank transfer sheet (Excel/CSV)
- Settings, audit logs, notifications
- Future-ready: PF/ESIC/TDS/loan/advance deductions (disabled), multi-role users

## Quick Start

```bash
cp .env.example .env
composer install
php artisan key:generate

# Configure MySQL in .env, then:
php artisan migrate --seed
php artisan storage:link   # optional
php artisan serve
```

### Default Admin Login

| Field    | Value             |
|----------|-------------------|
| Email    | `admin@awhr.local` |
| Password | `password`         |

## Salary Formula

```
Earned Salary = Monthly Gross × (Present Days / Working Days)
```

## Project Structure

```
app/
  Helpers/          Financial year helpers
  Http/Controllers/ Module controllers
  Http/Requests/    Form validation
  Models/           Eloquent models
  Repositories/     Data access
  Services/         Business logic (salary, payroll, leave, tax)
  Exports/          Excel export classes
config/awhr.php     Configurable defaults (no hardcoding)
database/migrations/
database/seeders/
resources/views/    Bootstrap 5 UI
```

## Modules

| Module | Route prefix |
|--------|--------------|
| Dashboard | `/dashboard` |
| Employees | `/employees` |
| Attendance | `/attendance` |
| Leaves | `/leaves` |
| Payroll | `/payroll` |
| Payslips | `/payslips` |
| Form 16 | `/form16` |
| Reports | `/reports` |
| Bank Transfer | `/bank-transfer` |
| Settings | `/settings` |
| Users | `/users` |
| Audit Logs | `/audit-logs` |

## License

Proprietary — AWHR
