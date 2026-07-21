import type { PatchPatientSqlInput } from "../../../repositories/patientRepository.js";

/** Request body for PATCH /api/v1/patients/:ref (demographics + existing workflow fields). */
export type PatchPatientApiBody = {
  case_status?: number;
  case_ref?: string;
  first_name?: string;
  last_name?: string;
  title?: number | null;
  email?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  phone?: string | null;
  aligner_monitoring_months?: number | null;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function trimOrNull(s: unknown, max: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (t === "") return null;
  return t.slice(0, max);
}

function trimOrEmpty(s: unknown, max: number): string {
  if (s == null) return "";
  return String(s).trim().slice(0, max);
}

/**
 * Maps validated API body fields to whitelisted `tbl_case` column updates.
 * Returns null if nothing would change in SQL (caller should 400).
 */
export function mapPatientPatchApiBodyToSql(
  body: PatchPatientApiBody
): PatchPatientSqlInput | null {
  const out: PatchPatientSqlInput = {};

  if (body.case_status != null && Number.isFinite(Number(body.case_status))) {
    out.case_status = Number(body.case_status);
  }
  if (body.case_ref != null && String(body.case_ref).trim() !== "") {
    out.case_ref = String(body.case_ref).trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "first_name")) {
    out.case_prenom = trimOrEmpty(body.first_name, 120);
  }
  if (Object.prototype.hasOwnProperty.call(body, "last_name")) {
    out.case_nom = trimOrEmpty(body.last_name, 120);
  }

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    const t = body.title;
    if (t === null) {
      out.case_title = null;
    } else if (t === 0 || t === 1) {
      out.case_title = t;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    out.case_email = trimOrNull(body.email, 255);
  }
  if (Object.prototype.hasOwnProperty.call(body, "address")) {
    out.case_address = trimOrNull(body.address, 255);
  }
  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    out.case_phone = trimOrNull(body.phone, 255);
  }

  if (Object.prototype.hasOwnProperty.call(body, "date_of_birth")) {
    const raw = body.date_of_birth;
    if (raw === null || raw === "") {
      out.case_naissance = null;
    } else {
      const s = String(raw).trim().slice(0, 10);
      if (!YMD.test(s)) {
        throw Object.assign(new Error("Invalid date_of_birth"), {
          statusCode: 400,
        });
      }
      out.case_naissance = s;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "aligner_monitoring_months")) {
    const raw = body.aligner_monitoring_months;
    if (raw === null) {
      out.aligner_monitoring_months = null;
    } else if (Number.isFinite(Number(raw))) {
      out.aligner_monitoring_months = Math.floor(Number(raw));
    }
  }

  if (Object.keys(out).length === 0) return null;
  return out;
}
