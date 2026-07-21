/**
 * Row mapping and display helpers for `users` queries.
 */
import { mysqlDate, ns, formatTs } from "../db/mysql.js";
import type { UserRow } from "./userRepositoryTypes.js";

export interface MysqlRow {
  user_id: number;
  user_name: string;
  user_firstname: string;
  user_lastname: string;
  user_phone?: string | null;
  user_website?: string | null;
  user_gender?: number | null;
  user_birthdate?: string | null;
  user_fonction?: string | null;
  user_dateentered: string;
  user_is_superadmin: number;
  user_status: number;
  idx_client: number;
  user_cabinet_nom?: string | null;
  user_cabinet_adresse_num?: string | null;
  user_cabinet_adresse?: string | null;
  user_cabinet_adresse_npa?: string | null;
  user_cabinet_adresse_ville?: string | null;
  user_cabinet_adresse_pays?: string | null;
  user_cabinet_nom_direct?: string | null;
  user_cabinet_adresse_direct?: string | null;
  user_cabinet_adresse_npa_direct?: string | null;
  user_cabinet_adresse_ville_direct?: string | null;
}

/** For API `user.fullName`: null when no first/last set (login is separate). */
export function userProfileFullName(
  user: Pick<UserRow, "firstName" | "lastName">
): string | null {
  const s = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return s || null;
}

/** For emails / salutations: fall back to login when no first+last. */
export function formatUserDisplayName(
  user: Pick<UserRow, "firstName" | "lastName" | "login">
): string {
  return userProfileFullName(user) || user.login;
}

function formatUserBirthDate(raw: unknown): string | null {
  const d = mysqlDate(raw);
  if (!d) return null;
  const y = d.getFullYear();
  if (y < 1900 || y > 2100) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatUserTitle(raw: unknown): string | null {
  const n = Number(raw);
  if (n === 2) return "2";
  if (n === 1) return "1";
  return null;
}

export function fromRow(r: MysqlRow): UserRow {
  const first = ns(r.user_firstname) ?? "";
  const last = ns(r.user_lastname) ?? "";
  return {
    id: r.user_id,
    login: r.user_name,
    name: `${first} ${last}`.trim() || r.user_name,
    firstName: first,
    lastName: last,
    title: formatUserTitle(r.user_gender),
    birthDate: formatUserBirthDate(r.user_birthdate),
    function: ns(r.user_fonction) ?? null,
    phone: r.user_phone ?? null,
    website: r.user_website ?? null,
    address: ns(r.user_cabinet_adresse) ?? null,
    zip: ns(r.user_cabinet_adresse_npa) ?? null,
    city: ns(r.user_cabinet_adresse_ville) ?? null,
    country: ns(r.user_cabinet_adresse_pays) ?? null,
    enteringDate: formatTs(mysqlDate(r.user_dateentered)),
    isCompany: r.user_is_superadmin === 1,
    cabinetId: r.idx_client || null,
    status: r.user_status,
  };
}

export const USER_SELECT_COLS = `
  user_id, user_name, user_firstname, user_lastname,
  user_gender, user_birthdate, user_fonction,
  user_phone, user_website, user_dateentered, user_is_superadmin, user_status, idx_client,
  user_cabinet_adresse, user_cabinet_adresse_npa, user_cabinet_adresse_ville, user_cabinet_adresse_pays
`;

/** Default lab profile columns only (pre–dual-profile schemas). */
export const USER_PROFILE_BASE_SELECT_COLS = `
  user_id, user_name, user_firstname, user_lastname,
  user_gender, user_birthdate, user_fonction,
  user_phone, user_website, user_dateentered, user_is_superadmin, user_status, idx_client,
  user_cabinet_nom, user_cabinet_adresse_num, user_cabinet_adresse,
  user_cabinet_adresse_npa, user_cabinet_adresse_ville, user_cabinet_adresse_pays
`;

/** Pre–personal-detail schemas (no gender/birth/function columns). */
export const USER_PROFILE_LEGACY_SELECT_COLS = `
  user_id, user_name, user_firstname, user_lastname,
  user_phone, user_website, user_dateentered, user_is_superadmin, user_status, idx_client,
  user_cabinet_nom, user_cabinet_adresse_num, user_cabinet_adresse,
  user_cabinet_adresse_npa, user_cabinet_adresse_ville, user_cabinet_adresse_pays
`;

export const USER_PROFILE_SELECT_COLS = `
  ${USER_PROFILE_BASE_SELECT_COLS.trim()},
  user_cabinet_nom_direct, user_cabinet_adresse_direct,
  user_cabinet_adresse_npa_direct, user_cabinet_adresse_ville_direct
`;
