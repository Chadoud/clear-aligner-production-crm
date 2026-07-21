/**
 * Case documents — case_docs (photographies, radiographies, documents, empreinte-3d)
 * and reply_docs (attachments on replies). Both use data/uploads/{case_id}/{filename}.
 */
import { mysqlQuery } from "../db/mysql.js";
import { logger } from "../logger.js";

export interface CaseDoc {
  type: string;
  filename: string;
  storedFilename: string;
  size?: string;
  /** Caption/message when uploaded with text (docs-prives). */
  message?: string;
}

const KNOWN_DOC_TYPES = new Set([
  "photographies",
  "photographie",
  "radiographies",
  "radiographie",
  "documents",
  "autres",
  "empreinte-3d",
  "docs-prives",
]);

const IMAGE_EXT_REGEX = /\.(jpe?g|png|gif|webp)$/i;

/**
 * Normalize DB type to one of: photographies | radiographies | documents | empreinte-3d.
 * Category comes from case_docs.docs_type (or doc_type). If missing we default to "documents";
 * only image extensions (jpg/png/gif/webp) are auto-classified as photographies. PDFs stay
 * "documents" unless the DB explicitly has docs_type = 'photographie' (as in the real app).
 */
export function normalizeDocType(
  rawType: string,
  storedFilename: string
): string {
  const t = rawType.toLowerCase().trim();
  if (
    t === "photographies" ||
    t === "photographie" ||
    t === "photo" ||
    t === "photos" ||
    t === "photography"
  )
    return "photographies";
  if (
    t === "radiographies" ||
    t === "radiographie" ||
    t === "radio" ||
    t === "x-ray" ||
    t === "xray"
  )
    return "radiographies";
  if (t === "empreinte-3d" || t === "empreinte 3d") return "empreinte-3d";
  if (t === "docs-prives" || t === "docs_prives" || t === "private")
    return "docs-prives";
  if (
    t === "documents" ||
    t === "autres" ||
    t === "autre" ||
    t === "other" ||
    t === "scan" ||
    t === "scans" ||
    t === "doc"
  )
    return "documents";
  if (IMAGE_EXT_REGEX.test(storedFilename)) return "photographies";
  return "documents";
}

/**
 * Legacy tbl_reply.reply_type when files were uploaded via Discussion → "Joindre un fichier".
 * Doc type ids aligned with case dossier tabs (type 8 = photo, 9 = radio, etc.).
 */
export function docCategoryFromReplyType(replyType: number): string | null {
  switch (replyType) {
    case 8:
      return "photographies";
    case 9:
      return "radiographies";
    case 1:
    case 2:
    case 5:
    case 6:
    case 7:
      return "empreinte-3d";
    case 20:
      return "docs-prives";
    case 4:
      return "documents";
    default:
      return null;
  }
}

function inferTypeFromReplyDoc(
  rawType: string,
  storedFilename: string,
  replyType?: number | null
): string {
  if (replyType != null && Number.isFinite(replyType)) {
    const fromReply = docCategoryFromReplyType(Number(replyType));
    if (fromReply) return fromReply;
  }
  if (KNOWN_DOC_TYPES.has(rawType))
    return normalizeDocType(rawType, storedFilename);
  return IMAGE_EXT_REGEX.test(storedFilename) ? "photographies" : "documents";
}

const TITLE_MESSAGE_SEP = "|||";

/** Parse docs_title: "originalName|||message" yields { filename, message }; else { filename } */
function parseDocsTitle(
  raw: string | null | undefined,
  storedFilename: string
): { filename: string; message?: string } {
  const s = String(raw ?? "").trim();
  if (!s) return { filename: storedFilename || "—" };
  const idx = s.indexOf(TITLE_MESSAGE_SEP);
  if (idx >= 0) {
    return {
      filename: s.slice(0, idx).trim() || storedFilename || "—",
      message: s.slice(idx + TITLE_MESSAGE_SEP.length).trim() || undefined,
    };
  }
  return { filename: s || storedFilename || "—" };
}

function mapRowToDoc(
  row: Record<string, unknown>,
  fromReplyDocs: boolean
): CaseDoc {
  const rawType = String(row.docs_type ?? row.doc_type ?? "documents")
    .toLowerCase()
    .trim();
  const storedFilename = String(row.docs_name ?? row.doc_name ?? "").trim();
  const replyTypeRaw = row.reply_type;
  const replyType =
    replyTypeRaw != null && Number.isFinite(Number(replyTypeRaw))
      ? Number(replyTypeRaw)
      : null;
  const type = fromReplyDocs
    ? inferTypeFromReplyDoc(rawType, storedFilename, replyType)
    : normalizeDocType(rawType, storedFilename);

  const rawTitle = (row.docs_title ??
    row.doc_type ??
    (row as Record<string, unknown>).original_filename ??
    row.docs_name ??
    row.doc_name) as string | null | undefined;
  const { filename, message } = parseDocsTitle(rawTitle, storedFilename);
  const size =
    (row.docs_size ?? row.doc_size)
      ? String(row.docs_size ?? row.doc_size ?? "").trim()
      : undefined;

  return { type, filename, storedFilename, size, message };
}

export async function getDocsByCaseId(caseId: number): Promise<CaseDoc[]> {
  try {
    const [caseRows, replyRows] = await Promise.all([
      mysqlQuery<Record<string, unknown>>(
        `SELECT * FROM case_docs WHERE case_idx = ? ORDER BY docs_id ASC`,
        [caseId]
      ),
      mysqlQuery<Record<string, unknown>>(
        `SELECT rd.doc_name, rd.doc_type, r.reply_type
         FROM reply_docs rd
         JOIN tbl_reply r ON r.reply_id = rd.reply_idx
         WHERE r.case_idx = ?
         ORDER BY rd.doc_id ASC`,
        [caseId]
      ),
    ]);

    return [
      ...caseRows.map((r) => mapRowToDoc(r, false)),
      ...replyRows.map((r) => mapRowToDoc(r, true)),
    ];
  } catch (err) {
    logger.warn({ err, caseId }, "getDocsByCaseId failed");
    return [];
  }
}

/**
 * Insert a case document row.
 * @param caseId - tbl_case.case_id
 * @param docsType - photographies | radiographies | documents | empreinte-3d
 * @param docsName - stored filename on disk
 * @param docsSize - optional formatted size (e.g. "1.2 MB")
 * @param docsTitle - optional display title (defaults to docsName)
 */
export async function insertCaseDoc(
  caseId: number,
  docsType: string,
  docsName: string,
  docsSize?: string,
  docsTitle?: string
): Promise<void> {
  await mysqlQuery(
    `INSERT INTO case_docs (case_idx, docs_type, docs_name, docs_size, docs_title)
     VALUES (?, ?, ?, ?, ?)`,
    [caseId, docsType, docsName, docsSize ?? null, docsTitle ?? docsName]
  );
}

/**
 * Delete a case document by case_idx and docs_name (stored filename).
 * Returns true if a row was deleted.
 */
export async function deleteCaseDoc(
  caseId: number,
  docsName: string
): Promise<boolean> {
  const result = await mysqlQuery<{ affectedRows: number }>(
    `DELETE FROM case_docs WHERE case_idx = ? AND docs_name = ?`,
    [caseId, docsName]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/**
 * Fetch reply attachments by reply IDs. Returns Map<replyId, CaseDoc[]>.
 * Uses reply_docs (reply_idx, doc_name, doc_type). doc_type stores display name.
 */
export async function getAttachmentsByReplyIds(
  replyIds: number[]
): Promise<Map<number, CaseDoc[]>> {
  const map = new Map<number, CaseDoc[]>();
  if (replyIds.length === 0) return map;
  try {
    const placeholders = replyIds.map(() => "?").join(", ");
    const rows = await mysqlQuery<
      Record<string, unknown> & { reply_idx: number }
    >(
      `SELECT rd.reply_idx, rd.doc_name, rd.doc_type, rd.doc_size, r.reply_type
       FROM reply_docs rd
       JOIN tbl_reply r ON r.reply_id = rd.reply_idx
       WHERE rd.reply_idx IN (${placeholders})
       ORDER BY rd.reply_idx, rd.doc_id ASC`,
      replyIds
    );
    for (const r of rows) {
      const replyId = Number(r.reply_idx);
      if (!map.has(replyId)) map.set(replyId, []);
      map.get(replyId)!.push(mapRowToDoc(r, true));
    }
  } catch (err) {
    logger.warn({ err, replyIds }, "getAttachmentsByReplyIds failed");
  }
  return map;
}

/**
 * Insert a reply attachment (reply_docs).
 * @param replyId - tbl_reply.reply_id
 * @param storedFilename - Stored filename on disk (doc_name)
 * @param originalFilename - Display name stored in doc_type
 */
export async function insertReplyDoc(
  replyId: number,
  storedFilename: string,
  originalFilename?: string
): Promise<void> {
  const name = String(storedFilename ?? "").trim();
  if (!name) return;
  const displayName = originalFilename?.trim() || name;
  await mysqlQuery(
    `INSERT INTO reply_docs (reply_idx, doc_name, doc_type)
     VALUES (?, ?, ?)`,
    [replyId, name, displayName]
  );
}

/**
 * Delete all reply_docs rows for a reply; returns stored filenames removed from DB.
 */
export async function deleteAllForReply(replyId: number): Promise<string[]> {
  const id = Number(replyId);
  if (!Number.isFinite(id) || id <= 0) return [];
  try {
    const rows = await mysqlQuery<{ doc_name: string }>(
      `SELECT doc_name FROM reply_docs WHERE reply_idx = ?`,
      [id]
    );
    const names = rows
      .map((r) => String(r.doc_name ?? "").trim())
      .filter(Boolean);
    if (names.length) {
      await mysqlQuery(`DELETE FROM reply_docs WHERE reply_idx = ?`, [id]);
    }
    return names;
  } catch {
    return [];
  }
}

/**
 * Delete a reply attachment by reply_id and stored filename.
 * Returns true if a row was deleted.
 */
export async function deleteReplyDoc(
  replyId: number,
  storedFilename: string
): Promise<boolean> {
  const safe = String(storedFilename ?? "")
    .replace(/\.\./g, "")
    .trim();
  if (!safe) return false;
  try {
    const result = await mysqlQuery<{ affectedRows: number }>(
      `DELETE FROM reply_docs WHERE reply_idx = ? AND doc_name = ?`,
      [replyId, safe]
    );
    return (result as unknown as { affectedRows: number }).affectedRows > 0;
  } catch {
    return false;
  }
}
