-- Core schema for Clear Aligner Production CRM (template).
-- Apply with: npm run db:setup

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS tbl_cabinet (
  cabinet_id            INT          NOT NULL AUTO_INCREMENT,
  cabinet_nom           VARCHAR(255) NOT NULL DEFAULT '',
  cabinet_nom_legal     VARCHAR(255) NOT NULL DEFAULT '',
  cabinet_phone         VARCHAR(100) NOT NULL DEFAULT '',
  cabinet_email         VARCHAR(255) NOT NULL DEFAULT '',
  cabinet_website       VARCHAR(255) NOT NULL DEFAULT '',
  cabinet_fax           VARCHAR(100) NOT NULL DEFAULT '',
  cabinet_adresse_num   VARCHAR(50)  NOT NULL DEFAULT '',
  cabinet_adresse       TEXT         NOT NULL,
  cabinet_adresse_npa   VARCHAR(20)  NOT NULL DEFAULT '',
  cabinet_adresse_ville VARCHAR(100) NOT NULL DEFAULT '',
  cabinet_adresse_pays  VARCHAR(100) NOT NULL DEFAULT '',
  cabinet_logo          VARCHAR(512) NULL,
  cabinet_entred        DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cabinet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  user_id                         INT          NOT NULL AUTO_INCREMENT,
  user_name                       VARCHAR(255) NOT NULL,
  user_password                   VARCHAR(255) NOT NULL,
  user_firstname                  VARCHAR(120) NOT NULL DEFAULT '',
  user_lastname                   VARCHAR(120) NOT NULL DEFAULT '',
  user_phone                      VARCHAR(100) NOT NULL DEFAULT '',
  user_website                    VARCHAR(255) NOT NULL DEFAULT '',
  user_cabinet_adresse            TEXT         NOT NULL,
  user_cabinet_adresse_npa        VARCHAR(20)  NOT NULL DEFAULT '',
  user_cabinet_adresse_ville      VARCHAR(100) NOT NULL DEFAULT '',
  user_cabinet_adresse_pays       VARCHAR(100) NOT NULL DEFAULT '',
  user_dateentered                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_datemodified               DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  user_is_superadmin              TINYINT      NOT NULL DEFAULT 0,
  user_status                     TINYINT      NOT NULL DEFAULT 1,
  idx_client                      INT          NOT NULL DEFAULT 0,
  user_cabinet_nom                VARCHAR(255) NULL,
  user_cabinet_adresse_num        VARCHAR(50)  NULL,
  user_gender                     TINYINT      NULL,
  user_birthdate                  DATE         NULL,
  user_fonction                   VARCHAR(255) NULL,
  profile_image                   VARCHAR(512) NULL,
  profile_image_direct            VARCHAR(512) NULL,
  user_cabinet_nom_direct         VARCHAR(255) NULL,
  user_cabinet_adresse_direct     TEXT         NULL,
  user_cabinet_adresse_npa_direct VARCHAR(20)  NULL,
  user_cabinet_adresse_ville_direct VARCHAR(100) NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_users_user_name (user_name),
  KEY idx_users_idx_client (idx_client),
  KEY idx_users_status (user_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_sidebar (
  sidebar_id           INT          NOT NULL AUTO_INCREMENT,
  sidebar_identify     VARCHAR(100) NOT NULL,
  sidebar_name_en      VARCHAR(255) NULL,
  sidebar_name_fr      VARCHAR(255) NULL,
  sidebar_parent       INT          NOT NULL DEFAULT 0,
  sidebar_has_children TINYINT      NOT NULL DEFAULT 0,
  sidebar_order        INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (sidebar_id),
  KEY idx_sidebar_identify (sidebar_identify)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_rights (
  user_idx   INT NOT NULL,
  rights_idx INT NOT NULL,
  PRIMARY KEY (user_idx, rights_idx),
  KEY idx_user_rights_rights (rights_idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_case (
  case_id                   INT           NOT NULL AUTO_INCREMENT,
  case_ref                  VARCHAR(50)   NOT NULL DEFAULT '',
  cabinet_idx               INT           NOT NULL,
  case_title                TINYINT       NOT NULL DEFAULT 0,
  case_prenom               VARCHAR(120)  NOT NULL DEFAULT '',
  case_nom                  VARCHAR(120)  NOT NULL DEFAULT '',
  case_naissance            DATE          NOT NULL,
  case_email                VARCHAR(255)  NOT NULL DEFAULT '',
  case_address              TEXT          NULL,
  case_phone                VARCHAR(50)   NULL,
  case_status               TINYINT       NOT NULL DEFAULT 3,
  case_comments             TEXT          NOT NULL,
  case_prop_price           DECIMAL(12,2) NULL DEFAULT 0,
  case_prop_cur             VARCHAR(10)   NULL DEFAULT 'CHF',
  case_created              DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  case_notif                TINYINT       NULL DEFAULT 0,
  case_notif_reason         TINYINT       NULL DEFAULT 0,
  case_livraison_souhaitee  DATE          NULL,
  case_stl                  TINYINT       NULL DEFAULT 0,
  case_external_stl         TEXT          NULL,
  username                  VARCHAR(255)  NULL,
  password_hash             VARCHAR(255)  NULL,
  mob_app_password          VARCHAR(64)   NULL,
  aligner_monitoring_months INT           NULL,
  PRIMARY KEY (case_id),
  KEY idx_case_cabinet (cabinet_idx),
  KEY idx_case_ref (case_ref),
  KEY idx_case_status (case_status),
  KEY idx_case_created (case_created)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_reply (
  reply_id        INT      NOT NULL AUTO_INCREMENT,
  case_idx        INT      NOT NULL,
  user_idx        INT      NOT NULL,
  reply_text      TEXT     NOT NULL,
  reply_type      INT      NOT NULL DEFAULT 0,
  reply_type_sub  INT      NULL,
  reply_created   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reply_edited_at DATETIME NULL,
  PRIMARY KEY (reply_id),
  KEY idx_reply_case (case_idx),
  KEY idx_reply_case_type (case_idx, reply_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_chat (
  chat_id        INT      NOT NULL AUTO_INCREMENT,
  case_idx       INT      NOT NULL,
  user_idx       INT      NOT NULL,
  cabinet_idx    INT      NOT NULL DEFAULT 0,
  chat_text      TEXT     NOT NULL,
  chat_created   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  chat_edited_at DATETIME NULL,
  PRIMARY KEY (chat_id),
  KEY idx_chat_case (case_idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_docs (
  docs_id    INT          NOT NULL AUTO_INCREMENT,
  case_idx   INT          NOT NULL,
  docs_type  VARCHAR(50)  NOT NULL,
  docs_name  VARCHAR(255) NOT NULL,
  docs_size  VARCHAR(50)  NULL,
  docs_title VARCHAR(512) NULL,
  PRIMARY KEY (docs_id),
  KEY idx_case_docs_case (case_idx),
  KEY idx_case_docs_name (case_idx, docs_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reply_docs (
  doc_id    INT          NOT NULL AUTO_INCREMENT,
  reply_idx INT          NOT NULL,
  doc_name  VARCHAR(255) NOT NULL,
  doc_type  VARCHAR(512) NULL,
  doc_size  VARCHAR(50)  NULL,
  PRIMARY KEY (doc_id),
  KEY idx_reply_docs_reply (reply_idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_suivi (
  suivi_id      INT      NOT NULL AUTO_INCREMENT,
  case_idx      INT      NOT NULL,
  user_idx      INT      NOT NULL,
  cabinet_idx   INT      NOT NULL,
  suivi_text    TEXT     NOT NULL,
  suivi_type    INT      NOT NULL DEFAULT 0,
  suivi_created DATETIME NOT NULL,
  PRIMARY KEY (suivi_id),
  KEY idx_suivi_case (case_idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_traitements (
  traitements_id   INT     NOT NULL AUTO_INCREMENT,
  case_idx         INT     NOT NULL,
  traitements_type TINYINT NOT NULL,
  PRIMARY KEY (traitements_id),
  UNIQUE KEY uq_traitements_case_type (case_idx, traitements_type),
  KEY idx_traitements_case (case_idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_events (
  ev_id         INT          NOT NULL AUTO_INCREMENT,
  case_idx      INT          NOT NULL,
  ev_title      VARCHAR(500) NOT NULL,
  ev_start_date DATE         NOT NULL,
  ev_start_time TIME         NOT NULL DEFAULT '00:00:00',
  ev_end_date   DATE         NOT NULL,
  ev_end_time   TIME         NOT NULL DEFAULT '00:00:00',
  ev_all_day    TINYINT      NOT NULL DEFAULT 1,
  ev_status     TINYINT      NOT NULL DEFAULT 1,
  ev_created_at DATETIME     NOT NULL,
  ev_created_by INT          NOT NULL,
  PRIMARY KEY (ev_id),
  KEY idx_events_case (case_idx),
  KEY idx_events_status_date (ev_status, ev_start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
