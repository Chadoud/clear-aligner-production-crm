/**
 * Read queries for `users`.
 */
import { mysqlQuery } from "../db/mysql.js";
import type { ListUsersOptions, UserRow } from "./userRepositoryTypes.js";
import {
  fromRow,
  USER_SELECT_COLS,
  USER_PROFILE_BASE_SELECT_COLS,
  USER_PROFILE_LEGACY_SELECT_COLS,
  USER_PROFILE_SELECT_COLS,
  type MysqlRow,
} from "./userRepositoryMappers.js";

const USER_SORT_COLUMNS: Record<string, string> = {
  id: "user_id",
  login: "user_name",
  name: "CONCAT(COALESCE(user_firstname, ''), ' ', COALESCE(user_lastname, ''))",
  enteringDate: "user_dateentered",
  status: "user_status",
};

function resolveUserListOrderBy(opts: ListUsersOptions): string {
  const sortBy = opts.sortBy?.trim();
  const column = sortBy ? USER_SORT_COLUMNS[sortBy] : USER_SORT_COLUMNS.id;
  const direction = opts.sortOrder === "asc" ? "ASC" : "DESC";
  return `ORDER BY ${column ?? USER_SORT_COLUMNS.id} ${direction}, user_id DESC`;
}

export async function getUserById(id: number): Promise<UserRow | null> {
  const rows = await mysqlQuery<MysqlRow>(
    `SELECT ${USER_SELECT_COLS} FROM users WHERE user_id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

/**
 * Get user by id including profile columns (user_cabinet_*). For company My Profile.
 */
export async function getUserByIdWithProfile(
  id: number
): Promise<MysqlRow | null> {
  for (const cols of [
    USER_PROFILE_SELECT_COLS,
    USER_PROFILE_BASE_SELECT_COLS,
    USER_PROFILE_LEGACY_SELECT_COLS,
  ]) {
    try {
      const rows = await mysqlQuery<MysqlRow>(
        `SELECT ${cols} FROM users WHERE user_id = ? LIMIT 1`,
        [id]
      );
      return rows[0] ?? null;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "ER_BAD_FIELD_ERROR") continue;
      throw err;
    }
  }
  return null;
}

export async function listUsers(
  opts: ListUsersOptions = {}
): Promise<{ users: UserRow[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 500);
  const offset = opts.offset ?? 0;
  const status = opts.status ?? 1;
  const conditions = [`user_status = ?`];
  const params: unknown[] = [status];

  if (opts.q?.trim()) {
    conditions.push(
      "(user_name LIKE ? OR CONCAT(user_firstname, ' ', user_lastname) LIKE ?)"
    );
    params.push(`%${opts.q.trim()}%`, `%${opts.q.trim()}%`);
  }

  if (opts.cabinet_id != null && Number.isFinite(opts.cabinet_id)) {
    conditions.push("idx_client = ?");
    params.push(opts.cabinet_id);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const [countRow] = await mysqlQuery<{ total: number }>(
    `SELECT COUNT(*) AS total FROM users ${where}`,
    params
  );
  const total = Number(countRow?.total ?? 0);

  const orderBy = resolveUserListOrderBy(opts);

  const rows = await mysqlQuery<MysqlRow>(
    `SELECT ${USER_SELECT_COLS} FROM users ${where}
     ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { users: rows.map(fromRow), total };
}

/** Find user by login/email (user_name). */
export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const normalized = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  const rows = await mysqlQuery<MysqlRow>(
    `SELECT ${USER_SELECT_COLS} FROM users WHERE user_name = ? LIMIT 1`,
    [normalized]
  );
  return rows[0] ? fromRow(rows[0]) : null;
}
