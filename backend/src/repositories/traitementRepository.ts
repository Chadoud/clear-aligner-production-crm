/**
 * Traitements — stored in tbl_traitements (legacy structure).
 *
 * One row per selected treatment per case. traitements_type = 1–8 (Tools::ListTraitements).
 * Mapping:
 *   1 — Traitement 3 à 3 (Maxillaire)
 *   2 — Traitement 3 à 3 (Mandibulaire)
 *   3 — Arcade complète (Maxillaire)
 *   4 — Arcade complète (Mandibulaire)
 *   5 — Faire au mieux en fonction de l'espace
 *   6 — Fermer tous les espaces
 *   7 — Encombrement supérieur
 *   8 — Encombrement inférieur
 */
import { mysqlQuery } from "../db/mysql.js";

/**
 * Fetch traitements_type values for a case.
 * @returns Array of numbers 1–8 (empty if none)
 */
export async function getTraitementsByCaseId(
  caseId: number
): Promise<number[]> {
  const rows = await mysqlQuery<{ traitements_type: number }>(
    "SELECT traitements_type FROM tbl_traitements WHERE case_idx = ? ORDER BY traitements_type",
    [caseId]
  );
  return rows
    .map((r) => Number(r.traitements_type))
    .filter((n) => n >= 1 && n <= 8);
}

/**
 * Replace traitements for a case: delete existing, insert new.
 * @param caseId — tbl_case.case_id
 * @param types — array of 1–8 (traitements_type values)
 */
export async function setTraitementsForCase(
  caseId: number,
  types: number[]
): Promise<void> {
  await mysqlQuery("DELETE FROM tbl_traitements WHERE case_idx = ?", [caseId]);
  const valid = types.filter((t) => t >= 1 && t <= 8);
  if (valid.length === 0) return;
  for (const t of valid) {
    await mysqlQuery(
      "INSERT INTO tbl_traitements (case_idx, traitements_type) VALUES (?, ?)",
      [caseId, t]
    );
  }
}
