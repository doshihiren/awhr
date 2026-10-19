// Tables for the leave ledger and monthly payslips. Safe to run on every start.
const db = require('./db');

async function ensurePayrollTables() {
  // Every change to an employee's leave balance is one row here; balance = SUM(days).
  await db.query(`CREATE TABLE IF NOT EXISTS leave_ledger (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    entry_date  DATE NOT NULL,
    days        DECIMAL(6,2) NOT NULL,
    kind        VARCHAR(20) NOT NULL,      -- opening | adjust | accrual | used
    ref         VARCHAR(40) NULL,          -- accrual:2026-11, payroll:2026-10 … (one per employee)
    note        VARCHAR(255) NULL,
    created_by  INT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_leave_ref (user_id, ref),
    INDEX idx_leave_user (user_id, entry_date)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS leave_accrual_runs (
    period      CHAR(7) PRIMARY KEY,       -- YYYY-MM
    run_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    employees   INT NOT NULL DEFAULT 0
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS payslips (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT NOT NULL,
    month             TINYINT NOT NULL,
    year              SMALLINT NOT NULL,
    days_in_month     TINYINT NOT NULL,
    working_days      DECIMAL(5,1) NOT NULL DEFAULT 0,
    present_days      DECIMAL(5,1) NOT NULL DEFAULT 0,
    half_days         DECIMAL(5,1) NOT NULL DEFAULT 0,
    leave_days        DECIMAL(5,1) NOT NULL DEFAULT 0,
    absent_days       DECIMAL(5,1) NOT NULL DEFAULT 0,
    holidays          DECIMAL(5,1) NOT NULL DEFAULT 0,
    not_employed_days DECIMAL(5,1) NOT NULL DEFAULT 0,
    unpaid_days       DECIMAL(5,2) NOT NULL DEFAULT 0,
    leave_used        DECIMAL(5,2) NOT NULL DEFAULT 0,
    lop_days          DECIMAL(5,2) NOT NULL DEFAULT 0,
    paid_days         DECIMAL(5,2) NOT NULL DEFAULT 0,
    basic             DECIMAL(12,2) NOT NULL DEFAULT 0,
    hra               DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_allowance   DECIMAL(12,2) NOT NULL DEFAULT 0,
    earned_basic      DECIMAL(12,2) NOT NULL DEFAULT 0,
    earned_hra        DECIMAL(12,2) NOT NULL DEFAULT 0,
    earned_other      DECIMAL(12,2) NOT NULL DEFAULT 0,
    bonus             DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_earned      DECIMAL(12,2) NOT NULL DEFAULT 0,
    pt                DECIMAL(12,2) NOT NULL DEFAULT 0,
    advance           DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_deduction   DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_deductions  DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_pay           DECIMAL(12,2) NOT NULL DEFAULT 0,
    leave_opening     DECIMAL(6,2) NOT NULL DEFAULT 0,
    leave_closing     DECIMAL(6,2) NOT NULL DEFAULT 0,
    remarks           VARCHAR(255) NULL,
    status            VARCHAR(12) NOT NULL DEFAULT 'generated',   -- generated | paid
    paid_on           DATE NULL,
    generated_at      DATETIME NULL,
    UNIQUE KEY uq_payslip (user_id, year, month)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS payroll_runs (
    period        CHAR(7) PRIMARY KEY,     -- YYYY-MM
    mode          VARCHAR(10) NOT NULL,    -- auto | manual
    employees     INT NOT NULL DEFAULT 0,
    generated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = { ensurePayrollTables };
