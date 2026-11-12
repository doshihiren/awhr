-- Awelion HR Suite: additive migration. Run only after a tested, private MySQL backup.
-- No existing tables, employee records or payroll rows are altered or deleted.
CREATE TABLE IF NOT EXISTS hrx_punch_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  event_date DATE NOT NULL,
  kind VARCHAR(16) NOT NULL,
  at_time TIME NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'self',
  recorded_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hrx_punch (user_id,event_date,kind),
  KEY idx_hrx_punch_date (event_date,user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hrx_historical_leave (
  user_id BIGINT NOT NULL,
  yr SMALLINT NOT NULL,
  mon TINYINT NOT NULL,
  eligible TINYINT(1) NOT NULL DEFAULT 1,
  total_days DECIMAL(7,2) NULL,
  paid_days DECIMAL(7,2) NULL,
  lop_days DECIMAL(7,2) NULL,
  note VARCHAR(300) NULL,
  updated_by BIGINT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,yr,mon)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hrx_leave_opening (
  user_id BIGINT NOT NULL PRIMARY KEY,
  as_of DATE NOT NULL,
  balance_days DECIMAL(7,2) NOT NULL,
  note VARCHAR(300) NULL,
  updated_by BIGINT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hrx_salary_revision (
  user_id BIGINT NOT NULL,
  effective_month DATE NOT NULL,
  gross_monthly DECIMAL(13,2) NOT NULL,
  note VARCHAR(300) NULL,
  updated_by BIGINT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,effective_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hrx_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT NOT NULL,
  user_id BIGINT NULL,
  action VARCHAR(70) NOT NULL,
  record_key VARCHAR(120) NULL,
  details_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hrx_audit (user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;