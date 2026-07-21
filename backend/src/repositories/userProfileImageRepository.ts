/**
 * User avatar column on legacy `users` table (column name varies by schema).
 */
import { mysqlQuery } from "../db/mysql.js";

const IMAGE_COLUMNS = [
  "profile_image",
  "photo",
  "image",
  "user_image",
] as const;

export type ProfileImageContext = "default" | "direct";

export async function getUserProfileImage(
  userId: number,
  context: ProfileImageContext = "default"
): Promise<string | null> {
  if (context === "direct") {
    try {
      const rows = await mysqlQuery<Record<string, unknown>>(
        "SELECT profile_image_direct AS img FROM users WHERE user_id = ? LIMIT 1",
        [userId]
      );
      const v = rows[0]?.img != null ? String(rows[0].img).trim() : "";
      if (v) return v;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "ER_BAD_FIELD_ERROR") throw err;
    }
    return null;
  }

  for (const col of IMAGE_COLUMNS) {
    try {
      const rows = await mysqlQuery<Record<string, unknown>>(
        `SELECT ${col} AS img FROM users WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      const raw = rows[0]?.img;
      const v = raw != null ? String(raw).trim() : "";
      if (v) return v;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "ER_BAD_FIELD_ERROR") continue;
      throw err;
    }
  }
  return null;
}

export async function updateUserProfileImage(
  userId: number,
  value: string | null,
  context: ProfileImageContext = "default"
): Promise<boolean> {
  const stored = value ?? "";
  if (context === "direct") {
    try {
      await mysqlQuery(
        `UPDATE users SET profile_image_direct = ?, user_datemodified = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [stored, userId]
      );
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "ER_BAD_FIELD_ERROR") return false;
      throw err;
    }
  }

  for (const col of IMAGE_COLUMNS) {
    try {
      await mysqlQuery(
        `UPDATE users SET ${col} = ?, user_datemodified = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [stored, userId]
      );
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "ER_BAD_FIELD_ERROR") continue;
      throw err;
    }
  }
  return false;
}
