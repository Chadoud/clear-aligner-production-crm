/**
 * Doctor invoice sequence — MySQL tbl_doctor_invoice_sequences.
 * Atomic increment per doctor per day (date_str ISO); bill ID display uses DD/MM/YYYY.
 */

import { mysqlQuery } from "../infrastructure/db/mysql/client.js";
import type { RequestPrincipal } from "../modules/auth/domain/principal.js";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS tbl_doctor_invoice_sequences (
    doctor_slug VARCHAR(60) NOT NULL,
    date_str    DATE        NOT NULL,
    sequence    INT         NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (doctor_slug, date_str)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let tableReady = false;

async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await mysqlQuery(CREATE_TABLE_SQL);
  tableReady = true;
}

export async function initDoctorInvoiceSequenceStorage(): Promise<void> {
  await ensureTable();
}

function slugifyDoctorName(name: string): string {
  if (!name || typeof name !== "string") return "Doctor";
  return (
    name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .slice(0, 50) || "Doctor"
  );
}

/**
 * Get and increment the sequence for a doctor on a given date.
 * Returns the new sequence number (after increment).
 */
export async function getAndIncrementSequence(
  _principal: RequestPrincipal,
  doctorName: string,
  dateStr?: string
): Promise<number> {
  await ensureTable();
  const slug = slugifyDoctorName(doctorName);
  const d = dateStr || new Date().toISOString().slice(0, 10);

  await mysqlQuery(
    `INSERT INTO tbl_doctor_invoice_sequences (doctor_slug, date_str, sequence)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE sequence = sequence + 1`,
    [slug, d]
  );

  const rows = await mysqlQuery<{ sequence: number }>(
    `SELECT sequence FROM tbl_doctor_invoice_sequences
     WHERE doctor_slug = ? AND date_str = ?
     LIMIT 1`,
    [slug, d]
  );
  return rows[0]?.sequence ?? 1;
}

/**
 * Peek the next sequence (without incrementing).
 */
export async function peekNextSequence(
  _principal: RequestPrincipal,
  doctorName: string,
  dateStr?: string
): Promise<number> {
  await ensureTable();
  const slug = slugifyDoctorName(doctorName);
  const d = dateStr || new Date().toISOString().slice(0, 10);

  const rows = await mysqlQuery<{ sequence: number }>(
    `SELECT sequence FROM tbl_doctor_invoice_sequences
     WHERE doctor_slug = ? AND date_str = ?
     LIMIT 1`,
    [slug, d]
  );
  const current = rows[0]?.sequence ?? 0;
  return current + 1;
}
