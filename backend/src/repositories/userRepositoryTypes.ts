/**
 * User repository public types (MySQL `users` / ACL).
 */

export interface UserRow {
  id: number;
  login: string;
  name: string;
  firstName: string;
  lastName: string;
  /** Legacy `user_gender`: 1 = Monsieur, 2 = Madame */
  title: string | null;
  birthDate: string | null;
  function: string | null;
  phone: string | null;
  website: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  enteringDate: string;
  isCompany: boolean;
  cabinetId: number | null;
  status: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  isCompany?: boolean;
  cabinetId?: number | null;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  /** Legacy `user_gender`: "1" = Monsieur, "2" = Madame */
  title?: string | null;
  /** ISO date YYYY-MM-DD */
  birthDate?: string | null;
  /** Legacy `user_fonction` */
  function?: string | null;
  phone?: string | null;
  website?: string | null;
  cabinetId?: number | null;
  isCompany?: boolean;
  /** Company profile: chat-visible display name (maps to user_cabinet_nom, same as mobile app) */
  displayName?: string | null;
  /** Company profile: legal/company name (legacy; prefer displayName for chat) */
  legalName?: string | null;
  /** Company profile: street address */
  address?: string | null;
  /** Company profile: postal code */
  zip?: string | null;
  /** Company profile: city */
  city?: string | null;
  /** Company profile: country */
  country?: string | null;
  /** Direct lab profile: chat-visible display name */
  directDisplayName?: string | null;
  /** @deprecated use directDisplayName */
  directLegalName?: string | null;
  directAddress?: string | null;
  directZip?: string | null;
  directCity?: string | null;
}

export interface SidebarRight {
  id: number;
  identify: string;
  name: string;
  parentId: number;
  hasChildren: number;
}

export interface UserRight {
  rightsIdx: number;
}

export interface ListUsersOptions {
  /** 1 = active, 2 = pending approval, -1 = refused */
  status?: number;
  limit?: number;
  offset?: number;
  q?: string;
  /** Filter by cabinet (idx_client) */
  cabinet_id?: number;
  /** id | login | name | enteringDate | status */
  sortBy?: string;
  /** asc | desc */
  sortOrder?: "asc" | "desc";
}
