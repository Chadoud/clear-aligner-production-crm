/**
 * mob_users — mobile app accounts keyed by case_id (id = tbl_case.case_id).
 */
import { mysqlQuery } from "../infrastructure/db/mysql/client.js";

export const CREATE_MOB_USERS_SQL = `
  CREATE TABLE IF NOT EXISTS mob_users (
    id                   BIGINT        NOT NULL PRIMARY KEY COMMENT 'case_id',
    email                VARCHAR(255)  NOT NULL,
    password_hash        VARCHAR(255)  NOT NULL,
    first_name           VARCHAR(255)  NULL,
    last_name            VARCHAR(255)  NULL,
    role                 VARCHAR(50)   NOT NULL DEFAULT 'patient',
    status               TINYINT       NOT NULL DEFAULT 1,
    gender               TINYINT       NULL,
    profile_image        VARCHAR(512)  NULL,
    external_doctor_id   VARCHAR(64)   NULL,
    last_login_at        TIMESTAMP     NULL,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_mob_users_email (email),
    INDEX idx_mob_users_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let tableReady = false;

export async function ensureMobUsersTable(): Promise<void> {
  if (tableReady) return;
  await mysqlQuery(CREATE_MOB_USERS_SQL);
  tableReady = true;
}
