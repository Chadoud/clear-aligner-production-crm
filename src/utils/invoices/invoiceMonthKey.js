/**
 * Parse invoice date text to a local calendar Date (00:00) for sorting/ranges.
 * Supports the same formats as {@link invoiceDateToMonthKey}.
 * @param {string} [dateText]
 * @returns {Date | null}
 */
export function parseInvoiceDateToLocalDate(dateText) {
  if (!dateText) return null;
  const txt = String(dateText).trim();
  if (!txt) return null;

  const slash = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const yearRaw = slash[3];
    const year =
      yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const iso = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(txt);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parse invoice date text into a YYYY-MM month key.
 * Supports DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, and Date-parseable strings.
 */
export function invoiceDateToMonthKey(dateText) {
  if (!dateText) return null;
  const txt = String(dateText).trim();
  if (!txt) return null;

  const slash = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const month = String(Number(slash[2])).padStart(2, "0");
    const yearRaw = slash[3];
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month}`;
  }

  const iso = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const year = iso[1];
    const month = String(Number(iso[2])).padStart(2, "0");
    return `${year}-${month}`;
  }

  const d = new Date(txt);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
