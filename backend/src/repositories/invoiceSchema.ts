/**
 * tbl_invoices DDL and incremental column ensures.
 */
import { mysqlQuery } from "../infrastructure/db/mysql/client.js";

export const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS tbl_invoices (
    id                              VARCHAR(36)   PRIMARY KEY,
    case_id                         INT           NULL,
    treatment_duration              VARCHAR(20)   NULL,
    total_price                     DECIMAL(12,2) NULL,
    monthly_payment_enabled         TINYINT(1)    NULL,
    amount_paid                     DECIMAL(12,2) NULL,
    invoice_status                  TINYINT       NULL,
    generated_date                  VARCHAR(50)   NULL,
    invoice_ref                     VARCHAR(50)   NULL,
    services_json                   LONGTEXT      NULL,
    monthly_plan_json               LONGTEXT      NULL,
    show_free_services             TINYINT(1)    NULL,
    paid_date                       VARCHAR(50)   NULL,
    doctor_bill_generated_at        VARCHAR(50)   NULL,
    doctor_bill_reminder_sent_at    VARCHAR(50)   NULL,
    down_payment_paid               TINYINT(1)    NULL,
    paid_month_indices             LONGTEXT      NULL,
    created_at                      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at                      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_case_id (case_id),
    INDEX idx_created (created_at),
    INDEX idx_invoice_ref (invoice_ref)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const EXTRA_COLUMNS = [
  "treatment_steps VARCHAR(20) NULL",
  "services_json LONGTEXT NULL",
  "monthly_plan_json LONGTEXT NULL",
  "show_free_services TINYINT(1) NULL",
  "paid_date VARCHAR(50) NULL",
  "doctor_bill_generated_at VARCHAR(50) NULL",
  "doctor_bill_reminder_sent_at VARCHAR(50) NULL",
  "down_payment_paid TINYINT(1) NULL",
  "paid_month_indices LONGTEXT NULL",
  "vat_rate DECIMAL(5,4) DEFAULT NULL",
  "payment_received_json LONGTEXT NULL",
];

let tableReady = false;

async function ensureColumns(): Promise<void> {
  const alter = [
    "ALTER TABLE tbl_invoices ADD COLUMN treatment_duration VARCHAR(20) NULL",
    "ALTER TABLE tbl_invoices ADD COLUMN total_price DECIMAL(12,2) NULL",
    "ALTER TABLE tbl_invoices ADD COLUMN monthly_payment_enabled TINYINT(1) NULL",
    "ALTER TABLE tbl_invoices ADD COLUMN amount_paid DECIMAL(12,2) NULL",
    "ALTER TABLE tbl_invoices ADD COLUMN invoice_status TINYINT NULL",
    "ALTER TABLE tbl_invoices ADD COLUMN generated_date VARCHAR(50) NULL",
    "ALTER TABLE tbl_invoices ADD COLUMN invoice_ref VARCHAR(50) NULL",
    ...EXTRA_COLUMNS.map((c) => `ALTER TABLE tbl_invoices ADD COLUMN ${c}`),
  ];
  for (const sql of alter) {
    try {
      await mysqlQuery(sql);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Duplicate column")) throw e;
    }
  }
  for (const idx of ["idx_invoice_ref (invoice_ref)"]) {
    try {
      await mysqlQuery(`ALTER TABLE tbl_invoices ADD INDEX ${idx}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Duplicate key")) throw e;
    }
  }
}

export async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await mysqlQuery(CREATE_TABLE_SQL);
  await ensureColumns();
  tableReady = true;
}

export async function initInvoiceStorage(): Promise<void> {
  await ensureTable();
}
