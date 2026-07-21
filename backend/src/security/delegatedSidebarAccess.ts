/**
 * Aligns API authorization with sidebar ACL (tbl_sidebar + user_rights).
 * Used for delegated doctors: capability gates match CRM nav / Rights UI labels.
 */
import {
  getUserRights,
  listSidebarRights,
} from "../repositories/userRepository.js";

/** Normalized name candidates aligned with navSections.js / tbl_sidebar (English). */
export const SIDEBAR_RIGHT_NAMES = {
  LIST_USERS: ["List of users", "List of user"],
  ADD_USER: ["Add new user"],
  LIST_CABINETS: ["List of cabinets"],
  ADD_CABINET: ["Add new cabinet"],
  DOCTORS_BILLING: ["Doctors Billing"],
} as const;

function normalizeSet(candidates: readonly string[]): Set<string> {
  return new Set(candidates.map((c) => c.trim().toLowerCase()));
}

/**
 * True if user has any assigned right whose sidebar display name matches a candidate.
 */
export async function userHasAnySidebarName(
  userId: number,
  candidates: readonly string[]
): Promise<boolean> {
  const assigned = await getUserRights(userId);
  if (assigned.length === 0) return false;
  const idSet = new Set(assigned);
  const sidebar = await listSidebarRights();
  const norm = normalizeSet([...candidates]);
  for (const row of sidebar) {
    if (!idSet.has(row.id)) continue;
    const label = (row.name ?? "").trim().toLowerCase();
    if (norm.has(label)) return true;
  }
  return false;
}

/**
 * True if user has any assigned right whose tbl_sidebar.sidebar_identify matches.
 */
export async function userHasAnySidebarIdentify(
  userId: number,
  candidates: readonly string[]
): Promise<boolean> {
  const assigned = await getUserRights(userId);
  if (assigned.length === 0) return false;
  const idSet = new Set(assigned);
  const sidebar = await listSidebarRights();
  const norm = normalizeSet([...candidates]);
  for (const row of sidebar) {
    if (!idSet.has(row.id)) continue;
    const id = (row.identify ?? "").trim().toLowerCase();
    if (norm.has(id)) return true;
  }
  return false;
}

/**
 * Match a child right under a parent section by parent display name (e.g. "Users", "Cabinets").
 * Use for repeated labels like "Edit" under different parents.
 */
export async function userHasChildRightUnderParentName(
  userId: number,
  parentName: string,
  childNameCandidates: readonly string[]
): Promise<boolean> {
  const assigned = await getUserRights(userId);
  if (assigned.length === 0) return false;
  const idSet = new Set(assigned);
  const sidebar = await listSidebarRights();
  const parentNorm = parentName.trim().toLowerCase();
  const childNorm = normalizeSet([...childNameCandidates]);

  const parentRow = sidebar.find((r) => {
    if ((r.name ?? "").trim().toLowerCase() !== parentNorm) return false;
    if (r.hasChildren) return true;
    return sidebar.some((c) => c.parentId === r.id);
  });
  if (!parentRow) return false;

  const parentId = parentRow.id;
  for (const row of sidebar) {
    if (row.parentId !== parentId) continue;
    if (!idSet.has(row.id)) continue;
    const label = (row.name ?? "").trim().toLowerCase();
    if (childNorm.has(label)) return true;
  }
  return false;
}
