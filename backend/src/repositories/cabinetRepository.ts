/**
 * Cabinets (doctor practices) — MySQL via tbl_cabinet.
 */
import { mysqlQuery, ns, mysqlDate } from "../db/mysql.js";

export interface Cabinet {
  id: number;
  slug: string;
  name: string | null;
  legal_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  fax: string | null;
  address_num: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  logo: string | null;
  entered_at: Date | null;
}

export interface ListCabinetsOptions {
  limit?: number;
  offset?: number;
  q?: string;
}

interface MysqlRow {
  cabinet_id: number;
  cabinet_nom: string;
  cabinet_nom_legal: string;
  cabinet_phone: string;
  cabinet_email: string;
  cabinet_website: string;
  cabinet_fax: string;
  cabinet_adresse_num: string;
  cabinet_adresse: string;
  cabinet_adresse_npa: string;
  cabinet_adresse_ville: string;
  cabinet_adresse_pays: string;
  cabinet_entred: string;
  cabinet_logo?: string | null;
}

function fromRow(r: MysqlRow): Cabinet {
  return {
    id: r.cabinet_id,
    slug: String(r.cabinet_id),
    name: ns(r.cabinet_nom),
    legal_name: ns(r.cabinet_nom_legal),
    phone: ns(r.cabinet_phone),
    email: ns(r.cabinet_email),
    website: ns(r.cabinet_website),
    fax: ns(r.cabinet_fax),
    address_num: ns(r.cabinet_adresse_num),
    address: ns(r.cabinet_adresse),
    zip: ns(r.cabinet_adresse_npa),
    city: ns(r.cabinet_adresse_ville),
    country: ns(r.cabinet_adresse_pays),
    logo:
      r.cabinet_logo != null && String(r.cabinet_logo).trim()
        ? String(r.cabinet_logo).trim()
        : null,
    entered_at: mysqlDate(r.cabinet_entred),
  };
}

export async function listCabinets(
  opts: ListCabinetsOptions = {}
): Promise<{ cabinets: Cabinet[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 500);
  const offset = opts.offset ?? 0;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.q?.trim()) {
    conditions.push("(cabinet_nom LIKE ? OR cabinet_email LIKE ?)");
    params.push(`%${opts.q.trim()}%`, `%${opts.q.trim()}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRow] = await mysqlQuery<{ total: number }>(
    `SELECT COUNT(*) AS total FROM tbl_cabinet ${where}`,
    params
  );
  const total = Number(countRow?.total ?? 0);

  const rows = await mysqlQuery<MysqlRow>(
    `SELECT * FROM tbl_cabinet ${where} ORDER BY cabinet_id ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { cabinets: rows.map(fromRow), total };
}

export async function getCabinetById(id: number): Promise<Cabinet | null> {
  const rows = await mysqlQuery<MysqlRow>(
    "SELECT * FROM tbl_cabinet WHERE cabinet_id = ? LIMIT 1",
    [id]
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

/**
 * Find cabinet by name (cabinet_nom). Returns first match.
 */
export async function getCabinetByName(
  name: string
): Promise<{ id: number } | null> {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return null;
  const rows = await mysqlQuery<{ cabinet_id: number }>(
    "SELECT cabinet_id FROM tbl_cabinet WHERE TRIM(cabinet_nom) = ? LIMIT 1",
    [trimmed]
  );
  return rows[0] ? { id: rows[0].cabinet_id } : null;
}

export interface InsertCabinetInput {
  name: string;
  legal_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  fax?: string | null;
  address_num?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
}

/** Legacy tbl_cabinet columns are NOT NULL; empty means "" not SQL NULL. */
function legacyCabinetText(value: unknown, fallback = ""): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

/**
 * Insert a new cabinet into tbl_cabinet.
 * @returns { id, slug } of the created row
 */
export async function insertCabinet(
  input: InsertCabinetInput
): Promise<{ id: number; slug: string }> {
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("Cabinet name is required");

  const result = await mysqlQuery(
    `INSERT INTO tbl_cabinet (
      cabinet_nom, cabinet_nom_legal, cabinet_phone, cabinet_email,
      cabinet_website, cabinet_fax,
      cabinet_adresse_num, cabinet_adresse, cabinet_adresse_npa,
      cabinet_adresse_ville, cabinet_adresse_pays
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      legacyCabinetText(input.legal_name, name),
      legacyCabinetText(input.phone),
      legacyCabinetText(input.email),
      legacyCabinetText(input.website),
      legacyCabinetText(input.fax),
      legacyCabinetText(input.address_num),
      legacyCabinetText(input.address),
      legacyCabinetText(input.zip),
      legacyCabinetText(input.city),
      legacyCabinetText(input.country),
    ]
  );
  const header = result as unknown as { insertId?: number };
  const insertId = header?.insertId ?? 0;
  return { id: insertId, slug: String(insertId) };
}

export interface UpdateCabinetInput {
  name?: string | null;
  legal_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  fax?: string | null;
  address_num?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  logo?: string | null;
}

/**
 * Update an existing cabinet by id.
 */
export async function updateCabinet(
  id: number,
  input: UpdateCabinetInput
): Promise<Cabinet | null> {
  const existing = await getCabinetById(id);
  if (!existing) return null;

  const name =
    input.name != null ? String(input.name).trim() || null : existing.name;
  const legal_name =
    input.legal_name !== undefined
      ? String(input.legal_name).trim() || null
      : existing.legal_name;
  const phone =
    input.phone !== undefined
      ? String(input.phone).trim() || null
      : existing.phone;
  const email =
    input.email !== undefined
      ? String(input.email).trim() || null
      : existing.email;
  const website =
    input.website !== undefined
      ? String(input.website).trim() || null
      : existing.website;
  const fax =
    input.fax !== undefined ? String(input.fax).trim() || null : existing.fax;
  const address_num =
    input.address_num !== undefined
      ? String(input.address_num).trim() || null
      : existing.address_num;
  const address =
    input.address !== undefined
      ? String(input.address).trim() || null
      : existing.address;
  const zip =
    input.zip !== undefined ? String(input.zip).trim() || null : existing.zip;
  const city =
    input.city !== undefined
      ? String(input.city).trim() || null
      : existing.city;
  const country =
    input.country !== undefined
      ? String(input.country).trim() || null
      : existing.country;
  const logo =
    input.logo !== undefined
      ? input.logo == null
        ? ""
        : String(input.logo).trim()
      : (existing.logo ?? "");

  try {
    await mysqlQuery(
      `UPDATE tbl_cabinet SET
        cabinet_nom = ?, cabinet_nom_legal = ?, cabinet_phone = ?,
        cabinet_email = ?, cabinet_website = ?, cabinet_fax = ?,
        cabinet_adresse_num = ?, cabinet_adresse = ?, cabinet_adresse_npa = ?,
        cabinet_adresse_ville = ?, cabinet_adresse_pays = ?,
        cabinet_logo = ?
      WHERE cabinet_id = ?`,
      [
        name,
        legal_name,
        phone,
        email,
        website,
        fax,
        address_num,
        address,
        zip,
        city,
        country,
        logo,
        id,
      ]
    );
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "ER_BAD_FIELD_ERROR" && input.logo === undefined) {
      await mysqlQuery(
        `UPDATE tbl_cabinet SET
          cabinet_nom = ?, cabinet_nom_legal = ?, cabinet_phone = ?,
          cabinet_email = ?, cabinet_website = ?, cabinet_fax = ?,
          cabinet_adresse_num = ?, cabinet_adresse = ?, cabinet_adresse_npa = ?,
          cabinet_adresse_ville = ?, cabinet_adresse_pays = ?
        WHERE cabinet_id = ?`,
        [
          name,
          legal_name,
          phone,
          email,
          website,
          fax,
          address_num,
          address,
          zip,
          city,
          country,
          id,
        ]
      );
    } else if (code === "ER_BAD_FIELD_ERROR" && input.logo !== undefined) {
      throw Object.assign(new Error("Cabinet logo column not available"), {
        code: "CABINET_LOGO_COLUMN_MISSING",
      });
    } else {
      throw err;
    }
  }
  return getCabinetById(id);
}

/** Update cabinet logo only. */
export async function updateCabinetLogo(
  id: number,
  logo: string | null
): Promise<Cabinet | null> {
  return updateCabinet(id, { logo });
}
