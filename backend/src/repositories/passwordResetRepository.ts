import { randomBytes, createHash } from "crypto";
import { mysqlQuery } from "../db/mysql.js";
import { logger } from "../logger.js";

interface PasswordResetRow {
  id: number;
  user_id: number;
  token_hash: string;
  created_at: Date;
  used_at: Date | null;
  expires_at: Date;
}

const TABLE_NAME = "tbl_password_resets";

/**
 * Creates tbl_password_resets if missing.
 * No FOREIGN KEY to `users`: legacy DBs may use engines/types that reject FKs;
 * user_id is still validated in application code before insert.
 */
async function ensureTableExists(): Promise<void> {
  try {
    await mysqlQuery(
      `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash CHAR(64) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        expires_at DATETIME NOT NULL,
        KEY idx_user_id (user_id),
        KEY idx_token_hash (token_hash),
        KEY idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
  } catch (err) {
    logger.error({ err }, "[passwordResetRepository] ensureTableExists failed");
    throw err;
  }
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createPasswordResetToken(
  userId: number,
  ttlMinutes: number
): Promise<string> {
  await ensureTableExists();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const ttl = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 60;

  // Use MySQL NOW() for created/expires so expiry checks match server timezone.
  await mysqlQuery(
    `INSERT INTO ${TABLE_NAME} (user_id, token_hash, created_at, expires_at)
     VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [userId, tokenHash, ttl]
  );

  return rawToken;
}

export async function findValidResetByToken(
  rawToken: string
): Promise<PasswordResetRow | null> {
  if (!rawToken) return null;
  await ensureTableExists();
  const tokenHash = hashToken(rawToken);
  const rows = await mysqlQuery<PasswordResetRow>(
    `SELECT id, user_id, token_hash, created_at, used_at, expires_at
     FROM ${TABLE_NAME}
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function markResetTokenUsed(id: number): Promise<void> {
  await ensureTableExists();
  await mysqlQuery(
    `UPDATE ${TABLE_NAME}
     SET used_at = NOW()
     WHERE id = ? AND used_at IS NULL`,
    [id]
  );
}

export async function invalidateAllResetTokensForUser(
  userId: number
): Promise<void> {
  await ensureTableExists();
  await mysqlQuery(
    `UPDATE ${TABLE_NAME}
     SET used_at = NOW()
     WHERE user_id = ? AND used_at IS NULL`,
    [userId]
  );
}
