-- Satellite tables normally ensured at runtime. Shipped here so seed + CI can
-- populate invoices without waiting for the API process.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_invoices (
  id                           VARCHAR(36)   NOT NULL,
  case_id                      INT           NULL,
  treatment_duration           VARCHAR(20)   NULL,
  treatment_steps              VARCHAR(20)   NULL,
  total_price                  DECIMAL(12,2) NULL,
  monthly_payment_enabled      TINYINT(1)    NULL,
  amount_paid                  DECIMAL(12,2) NULL,
  invoice_status               TINYINT       NULL,
  generated_date               VARCHAR(50)   NULL,
  invoice_ref                  VARCHAR(50)   NULL,
  services_json                LONGTEXT      NULL,
  monthly_plan_json            LONGTEXT      NULL,
  show_free_services           TINYINT(1)    NULL,
  paid_date                    VARCHAR(50)   NULL,
  doctor_bill_generated_at     VARCHAR(50)   NULL,
  doctor_bill_reminder_sent_at VARCHAR(50)   NULL,
  down_payment_paid            TINYINT(1)    NULL,
  paid_month_indices           LONGTEXT      NULL,
  vat_rate                     DECIMAL(5,4)  NULL,
  payment_received_json        LONGTEXT      NULL,
  created_at                   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at                   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_case_id (case_id),
  KEY idx_created (created_at),
  KEY idx_invoice_ref (invoice_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_services_lab (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50)   NOT NULL,
  service     VARCHAR(500)  NULL,
  vpt         DECIMAL(10,4) NULL,
  points      DECIMAL(10,4) NULL,
  point_value DECIMAL(10,4) NULL DEFAULT 1.0,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_services_direct (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50)   NOT NULL,
  service     VARCHAR(500)  NULL,
  vpt         DECIMAL(10,4) NULL,
  points      DECIMAL(10,4) NULL,
  point_value DECIMAL(10,4) NULL DEFAULT 1.0,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_password_resets (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at    DATETIME NULL,
  expires_at DATETIME NOT NULL,
  KEY idx_user_id (user_id),
  KEY idx_token_hash (token_hash),
  KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_checkbox_stripping (
  case_idx INT NOT NULL PRIMARY KEY,
  steps_data JSON NULL,
  case_ref VARCHAR(50) NULL,
  stripping_completed_steps VARCHAR(50) NULL,
  last_updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_stripping_v2 (
  case_idx INT NOT NULL PRIMARY KEY,
  case_ref VARCHAR(50) NULL,
  schema_version SMALLINT NOT NULL DEFAULT 1,
  scene_json JSON NOT NULL,
  last_updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_tooth (
  tooth_id INT AUTO_INCREMENT PRIMARY KEY,
  case_idx INT NOT NULL,
  tooth_num INT NOT NULL,
  tooth_taq VARCHAR(10) NOT NULL,
  tooth_val TEXT NULL,
  INDEX idx_case (case_idx),
  INDEX idx_case_taq (case_idx, tooth_taq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_user_notes (
  note_id INT AUTO_INCREMENT PRIMARY KEY,
  case_idx INT NOT NULL,
  user_idx INT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_case (case_idx),
  INDEX idx_user (user_idx),
  INDEX idx_case_user (case_idx, user_idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mob_users (
  id                 BIGINT       NOT NULL PRIMARY KEY,
  email              VARCHAR(255) NOT NULL,
  password_hash      VARCHAR(255) NOT NULL,
  first_name         VARCHAR(255) NULL,
  last_name          VARCHAR(255) NULL,
  role               VARCHAR(50)  NOT NULL DEFAULT 'patient',
  status             TINYINT      NOT NULL DEFAULT 1,
  gender             TINYINT      NULL,
  profile_image      VARCHAR(512) NULL,
  external_doctor_id VARCHAR(64)  NULL,
  last_login_at      TIMESTAMP    NULL,
  created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mob_users_email (email),
  INDEX idx_mob_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mob_case_channel_read (
  user_id INT NOT NULL,
  case_id INT NOT NULL,
  channel VARCHAR(16) NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, case_id, channel),
  KEY idx_mob_case_channel_read_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_doctor_invoice_sequences (
  doctor_slug VARCHAR(60) NOT NULL,
  date_str    DATE        NOT NULL,
  sequence    INT         NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_slug, date_str)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
