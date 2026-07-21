/**
 * Keep mob_users in sync with CRM legacy users — mobile app reads mob_users.
 */
import { mysqlQuery } from "../db/mysql.js";

export type ProfileImageContext = "default" | "direct";

async function legacyLoginForUser(userId: number): Promise<string | null> {
  const rows = await mysqlQuery<{ user_name: string }>(
    "SELECT user_name FROM users WHERE user_id = ? LIMIT 1",
    [userId]
  );
  const login = String(rows[0]?.user_name ?? "")
    .trim()
    .toLowerCase();
  return login || null;
}

/** Sync doctor first/last name to mob_users after CRM or mobile profile save. */
export async function syncMobUsersDoctorIdentity(
  legacyUserId: number,
  firstName: string | null,
  lastName: string | null
): Promise<void> {
  const firstTrim = firstName != null ? String(firstName).trim() || null : null;
  const lastTrim =
    lastName != null ? String(lastName).trim().toUpperCase() || null : null;
  try {
    await mysqlQuery(
      `UPDATE mob_users SET first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE role = 'doctor' AND external_doctor_id = ?`,
      [firstTrim, lastTrim, legacyUserId]
    );
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== "ER_BAD_FIELD_ERROR" && code !== "ER_NO_SUCH_TABLE") throw err;
  }
}

export async function syncMobUsersProfileImage(
  legacyUserId: number,
  role: "company" | "doctor",
  profileImagePath: string | null,
  context: ProfileImageContext = "default"
): Promise<void> {
  const stored = profileImagePath ?? "";
  const column =
    context === "direct" ? "profile_image_direct" : "profile_image";

  if (role === "doctor") {
    try {
      await mysqlQuery(
        `UPDATE mob_users SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
         WHERE role = 'doctor' AND external_doctor_id = ?`,
        [stored, legacyUserId]
      );
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "ER_BAD_FIELD_ERROR" && code !== "ER_NO_SUCH_TABLE")
        throw err;
    }
    const login = await legacyLoginForUser(legacyUserId);
    if (login) {
      await syncMobUsersProfileImageByLogin(login, stored, context);
    }
    return;
  }

  const login = await legacyLoginForUser(legacyUserId);
  if (login) {
    await syncMobUsersProfileImageByLogin(login, stored, context);
  }
}

async function syncMobUsersProfileImageByLogin(
  login: string,
  stored: string,
  context: ProfileImageContext
): Promise<void> {
  const column =
    context === "direct" ? "profile_image_direct" : "profile_image";
  const queries = [
    `UPDATE mob_users SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
     WHERE role IN ('admin', 'super_admin') AND LOWER(email) = ?`,
    `UPDATE mob_users SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
     WHERE role IN ('admin', 'super_admin') AND LOWER(username) = ?`,
  ];

  for (const sql of queries) {
    try {
      await mysqlQuery(sql, [stored, login]);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "ER_BAD_FIELD_ERROR" || code === "ER_NO_SUCH_TABLE")
        continue;
      throw err;
    }
  }
}
