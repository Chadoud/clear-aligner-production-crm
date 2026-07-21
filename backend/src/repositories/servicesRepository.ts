/**
 * Services persistence — tbl_services_lab, tbl_services_direct.
 * Each service has its own point_value (no global tbl_brand_settings).
 */

import { mysqlQuery } from "../infrastructure/db/mysql/client.js";

const BRAND_TABLE: Record<string, string> = {
  Lab: "tbl_services_lab",
  Direct: "tbl_services_direct",
};

const CREATE_LAB = `
  CREATE TABLE IF NOT EXISTS tbl_services_lab (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(50)   NOT NULL,
    service     VARCHAR(500)   NULL,
    vpt         DECIMAL(10,4) NULL,
    points      DECIMAL(10,4) NULL,
    point_value DECIMAL(10,4) NULL DEFAULT 1.0,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const CREATE_DIRECT = `
  CREATE TABLE IF NOT EXISTS tbl_services_direct (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(50)   NOT NULL,
    service     VARCHAR(500)   NULL,
    vpt         DECIMAL(10,4) NULL,
    points      DECIMAL(10,4) NULL,
    point_value DECIMAL(10,4) NULL DEFAULT 1.0,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let tablesReady = false;

async function ensureTables(): Promise<void> {
  if (tablesReady) return;
  await mysqlQuery(CREATE_LAB);
  await mysqlQuery(CREATE_DIRECT);
  tablesReady = true;
}

export async function initServicesStorage(): Promise<void> {
  await ensureTables();
}

function getTable(brand: string): string | null {
  const table = BRAND_TABLE[brand];
  return table ?? null;
}

export interface ServiceRow {
  code: string;
  service: string | null;
  vpt: number | null;
  points: number | null;
  point_value: number | null;
}

/**
 * Get all services for a brand.
 */
export async function getServicesByBrand(brand: string): Promise<
  {
    code: string;
    service: string | null;
    vpt: number | null;
    points: number | null;
    point_value: number | null;
  }[]
> {
  await ensureTables();
  const table = getTable(brand);
  if (!table) return [];

  const rows = await mysqlQuery<{
    code: string;
    service: string | null;
    vpt: string | null;
    points: string | null;
    point_value: string | null;
  }>(
    `SELECT code, service, vpt, points, point_value FROM ${table} ORDER BY sort_order ASC, code ASC`
  );

  return rows.map((r) => ({
    code: r.code,
    service: r.service,
    vpt: r.vpt != null ? Number(r.vpt) : null,
    points: r.points != null ? Number(r.points) : null,
    point_value: r.point_value != null ? Number(r.point_value) : null,
  }));
}

/**
 * Update a single service's vpt/points/point_value.
 */
export async function updateService(
  brand: string,
  code: string,
  data: {
    vpt?: number | null;
    points?: number | null;
    point_value?: number | null;
  }
): Promise<void> {
  await ensureTables();
  const table = getTable(brand);
  if (!table) return;

  const updates: string[] = [];
  const params: unknown[] = [];
  if (data.vpt !== undefined) {
    updates.push("vpt = ?");
    params.push(data.vpt);
  }
  if (data.points !== undefined) {
    updates.push("points = ?");
    params.push(data.points);
  }
  if (data.point_value !== undefined) {
    updates.push("point_value = ?");
    params.push(data.point_value);
  }
  if (updates.length === 0) return;

  params.push(code);
  await mysqlQuery(
    `UPDATE ${table} SET ${updates.join(", ")} WHERE code = ?`,
    params
  );
}

/**
 * Replace all services for a brand (bulk update).
 */
export async function replaceServices(
  brand: string,
  services: Array<{
    code: string;
    service?: string | null;
    vpt?: number | null;
    points?: number | null;
    point_value?: number | null;
  }>
): Promise<void> {
  await ensureTables();
  const table = getTable(brand);
  if (!table) return;

  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    if (!s?.code) continue;
    await mysqlQuery(
      `INSERT INTO ${table} (code, service, vpt, points, point_value, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         service = COALESCE(VALUES(service), service),
         vpt = COALESCE(VALUES(vpt), vpt),
         points = COALESCE(VALUES(points), points),
         point_value = COALESCE(VALUES(point_value), point_value),
         sort_order = VALUES(sort_order)`,
      [
        s.code,
        s.service ?? null,
        s.vpt ?? null,
        s.points ?? null,
        s.point_value ?? 1,
        i,
      ]
    );
  }
}

/**
 * Get services for a brand (API returns services with point_value per service).
 */
export async function getServicesWithPointValue(
  brand: string
): Promise<{ services?: unknown[] }> {
  const services = await getServicesByBrand(brand);
  const servicesPayload = services.map((s) => ({
    code: s.code,
    service: s.service,
    vpt: s.vpt,
    points: s.points,
    point_value: s.point_value ?? 1,
  }));
  return { services: servicesPayload };
}
