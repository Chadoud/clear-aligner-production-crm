import mysql from "mysql2/promise";
import { config } from "../../../config.js";

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    if (!config.sourceDb?.url) {
      throw new Error(
        "SOURCE_DB_URL is not set. See backend/.env.example."
      );
    }
    pool = mysql.createPool({
      uri: config.sourceDb.url,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 100,
      enableKeepAlive: true,
      connectTimeout: 10000,
    });
  }
  return pool;
}

export async function mysqlQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const conn = await getPool().getConnection();
  try {
    const [rows] = await conn.query(sql, params);
    return rows as T[];
  } finally {
    conn.release();
  }
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}
