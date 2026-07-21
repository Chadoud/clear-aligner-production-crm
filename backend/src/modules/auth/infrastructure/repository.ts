/**
 * Authentication — MySQL only.
 * Password verification: bcrypt ($2a$ / $2b$ / $2y$, full hash length ≥ 60).
 */
import bcrypt from "bcryptjs";
import { mysqlQuery } from "../../../db/mysql.js";
import { logger } from "../../../logger.js";

export interface AuthUser {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: "company" | "doctor";
  cabinetId: number | null;
  /** cabinet_nom from tbl_cabinet — matches patient.cabinet in API responses */
  cabinetName: string | null;
}

interface RawUser {
  user_id: number;
  user_name: string;
  user_password: string;
  user_firstname: string;
  user_lastname: string;
  user_status: number;
  user_is_superadmin: number;
  idx_client: number;
}

async function verifyPassword(
  plain: string,
  storedHash: string
): Promise<boolean> {
  const hash = String(storedHash || "");
  if (
    !(
      hash.startsWith("$2a$") ||
      hash.startsWith("$2b$") ||
      hash.startsWith("$2y$")
    ) ||
    hash.length < 60
  ) {
    return false;
  }
  return bcrypt.compare(plain, hash);
}

export async function findAndVerifyUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const rows = await mysqlQuery<RawUser>(
    `SELECT user_id, user_name, user_password, user_firstname, user_lastname,
            user_status, user_is_superadmin, idx_client
     FROM users
     WHERE user_name = ? AND user_status = 1
     LIMIT 1`,
    [normalizedEmail]
  );

  const user = rows[0];
  if (!user) {
    logger.debug(
      { email: normalizedEmail },
      "Auth: user not found or inactive"
    );
    return null;
  }

  const ok = await verifyPassword(password, user.user_password);
  if (!ok) {
    logger.debug({ email: normalizedEmail }, "Auth: invalid password");
    return null;
  }

  const fullName =
    [user.user_firstname, user.user_lastname]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  const role: "company" | "doctor" =
    user.user_is_superadmin === 1 ? "company" : "doctor";
  const cabinetId =
    user.idx_client != null && user.idx_client !== 0
      ? Number(user.idx_client)
      : null;
  const cabinetName = await fetchCabinetName(cabinetId);

  logger.info({ userId: user.user_id, role }, "Login successful");

  return {
    id: user.user_id,
    username: user.user_name,
    firstName: user.user_firstname || null,
    lastName: user.user_lastname || null,
    fullName,
    role,
    cabinetId,
    cabinetName,
  };
}

async function fetchCabinetName(
  cabinetId: number | null
): Promise<string | null> {
  if (!cabinetId) return null;
  try {
    const rows = await mysqlQuery<{ cabinet_nom: string }>(
      "SELECT cabinet_nom FROM tbl_cabinet WHERE cabinet_id = ? LIMIT 1",
      [cabinetId]
    );
    return rows[0]?.cabinet_nom?.trim() || null;
  } catch {
    return null;
  }
}

/** Exported for unit tests */
export const __test__ = { verifyPassword };
