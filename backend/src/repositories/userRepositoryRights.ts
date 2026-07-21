/**
 * Sidebar ACL (`tbl_sidebar`, `user_rights`).
 */
import { mysqlQuery } from "../db/mysql.js";
import type { SidebarRight } from "./userRepositoryTypes.js";

/**
 * Deprecated/unused rights to hide from the Rights UI.
 * The CRM uses company/doctor scope, not tbl_sidebar rights. These legacy permissions
 * (from the old PHP app) are not enforced in the CRM. Matches if identifier contains
 * any of these (case-insensitive).
 */
const RIGHTS_HIDDEN_PATTERNS = [
  "new-request",
  "new_request",
  "nouvelle_demande",
  "plan_payment",
  "plan_paiement",
  "plan_paeiment",
  "chat",
  "suivi_patient",
  "devis",
  "infos_add",
  "infos_index",
  "infos_utiles",
  "calendar", // Legacy delivery calendar – not implemented in CRM
];

function isRightHidden(identify: string): boolean {
  const id = (identify ?? "").trim().toLowerCase();
  if (!id) return true;
  return RIGHTS_HIDDEN_PATTERNS.some((p) => id.includes(p));
}

const CRM_DOCTORS_BILLING_IDENTIFY = "crm_doctors_billing";

/**
 * Ensures tbl_sidebar has a row for Doctors Billing so the Rights UI and nav ACL
 * can match "Doctors Billing" (see navSections.js). Idempotent.
 */
async function ensureDoctorsBillingSidebarRow(): Promise<void> {
  try {
    const countRows = await mysqlQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM tbl_sidebar
       WHERE sidebar_identify = ?
          OR LOWER(TRIM(COALESCE(sidebar_name_en, ''))) = 'doctors billing'
          OR LOWER(TRIM(COALESCE(sidebar_name_fr, ''))) = 'doctors billing'`,
      [CRM_DOCTORS_BILLING_IDENTIFY]
    );
    const count = Number(countRows[0]?.c ?? 0);
    if (count > 0) return;

    await mysqlQuery(
      `INSERT INTO tbl_sidebar (
        sidebar_identify,
        sidebar_name_en,
        sidebar_name_fr,
        sidebar_parent,
        sidebar_has_children,
        sidebar_order
      )
      SELECT ?, 'Doctors Billing', 'Doctors Billing', 0, 0,
        COALESCE((SELECT MAX(s2.sidebar_order) + 1 FROM tbl_sidebar s2), 1)
      WHERE NOT EXISTS (
        SELECT 1 FROM tbl_sidebar WHERE sidebar_identify = ?
      )`,
      [CRM_DOCTORS_BILLING_IDENTIFY, CRM_DOCTORS_BILLING_IDENTIFY]
    );
  } catch (err) {
    console.warn(
      "[userRepository] ensureDoctorsBillingSidebarRow:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/** List all rights from tbl_sidebar (ACL resources). Prefers English labels; hides deprecated items. */
export async function listSidebarRights(): Promise<SidebarRight[]> {
  await ensureDoctorsBillingSidebarRow();
  const rows = await mysqlQuery<{
    sidebar_id: number;
    sidebar_identify: string;
    sidebar_name: string;
    sidebar_parent: number;
    sidebar_has_children: number;
  }>(
    `SELECT sidebar_id, sidebar_identify,
            COALESCE(sidebar_name_en, sidebar_name_fr, sidebar_identify) AS sidebar_name,
            COALESCE(sidebar_parent, 0) AS sidebar_parent,
            COALESCE(sidebar_has_children, 0) AS sidebar_has_children
     FROM tbl_sidebar
     ORDER BY sidebar_order ASC, sidebar_id ASC`
  );
  return rows
    .filter((r) => !isRightHidden(r.sidebar_identify ?? ""))
    .map((r) => ({
      id: r.sidebar_id,
      identify: r.sidebar_identify ?? "",
      name: r.sidebar_name ?? r.sidebar_identify ?? "",
      parentId: r.sidebar_parent ?? 0,
      hasChildren: r.sidebar_has_children ?? 0,
    }));
}

/** Get user's assigned rights (rights_idx from user_rights). */
export async function getUserRights(userId: number): Promise<number[]> {
  const rows = await mysqlQuery<{ rights_idx: number }>(
    `SELECT rights_idx FROM user_rights WHERE user_idx = ?`,
    [userId]
  );
  return rows.map((r) => r.rights_idx);
}

/** Replace user's rights. Deletes all and inserts new. */
export async function updateUserRights(
  userId: number,
  rightsIds: number[]
): Promise<void> {
  await mysqlQuery("DELETE FROM user_rights WHERE user_idx = ?", [userId]);
  if (rightsIds.length === 0) return;
  const values = rightsIds.map(() => `(?, ?)`).join(", ");
  const flat = rightsIds.flatMap((rid) => [userId, rid]);
  await mysqlQuery(
    `INSERT INTO user_rights (user_idx, rights_idx) VALUES ${values}`,
    flat
  );
}
