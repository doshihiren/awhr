-- REVIEW-ONLY. Never execute before a verified production DB backup.
-- Intended identity mapping based on Owner-supplied read-only query:
-- Diya Shah id=9  currently team/active -> hr/active
-- Diya HR   id=14 currently hr/active   -> hr/resigned (soft archive)
-- IMPORTANT: Keep all payroll/leave/attendance/audit rows as historical records.
-- Before running, re-query user IDs, names and employee_details statuses.
--
-- Do not copy leave, salary or attendance rows from id=14 onto id=9.
-- It is a distinct login with different historical data.
-- Run as a single transaction in a client that preserves the session.
START TRANSACTION;

SELECT u.id,u.name,u.role,COALESCE(ed.status,'active') AS status
FROM users u LEFT JOIN employee_details ed ON ed.user_id=u.id
WHERE u.id IN (9,14) FOR UPDATE;

-- Guarded; will affect zero rows if the identities or expected roles changed.
UPDATE users SET role='hr'
WHERE id=9 AND name='Diya Shah' AND role='team';

-- Existing Diya HR login remains in the database for historical references.
INSERT INTO employee_details (user_id,status,resignation_date)
SELECT u.id,'resigned',CURDATE()
FROM users u WHERE u.id=14 AND u.name='Diya HR' AND u.role='hr'
ON DUPLICATE KEY UPDATE status='resigned',
  resignation_date=COALESCE(resignation_date,CURDATE());

SELECT u.id,u.name,u.role,COALESCE(ed.status,'active') AS status
FROM users u LEFT JOIN employee_details ed ON ed.user_id=u.id
WHERE u.id IN (9,14);

-- IMPORTANT: review the SELECT output and verify both target records.
-- For a guarded precondition this script does not force a row count assertion.
-- If either row does not match the intended account, ROLLBACK rather than COMMIT.
-- COMMIT is intentionally omitted.
-- Once verified in the SAME DB SESSION, execute COMMIT manually.
-- Otherwise execute ROLLBACK.
