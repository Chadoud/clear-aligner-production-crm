/**
 * Doctor bill payment reminder: due on the 15th of the month following
 * the latest invoice date included in the bill (same period label as CRM emails).
 */

/** Parse generated_date / DD/MM/YYYY / ISO into local calendar date. */
export function parseGeneratedDateToLocalDate(
  dateText: string | null | undefined
): Date | null {
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

/** 15th of the calendar month after the month of `periodEnd`. */
export function fifteenthOfMonthAfterPeriodEnd(periodEnd: Date): Date {
  return new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 15);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isReminderDueDateReached(reminderDue: Date): boolean {
  const today = startOfLocalDay(new Date());
  const due = startOfLocalDay(reminderDue);
  return today.getTime() >= due.getTime();
}

/** Invoice / bill date for display and emails: DD/MM/YYYY. */
export function formatGeneratedDateForDisplay(
  dateText: string | null | undefined
): string {
  if (!dateText || !String(dateText).trim()) return "\u2014";
  const d = parseGeneratedDateToLocalDate(dateText);
  if (!d) return "\u2014";
  return formatDdMmYyyy(d);
}

function formatDdMmYyyy(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Min–max label like CRM `getBillingPeriodLabelFromLineItems`. */
export function formatBillPeriodDdMmYyyyRange(dates: Date[]): string | null {
  if (dates.length === 0) return null;
  let min = dates[0];
  let max = dates[0];
  for (let i = 1; i < dates.length; i++) {
    const t = dates[i].getTime();
    if (t < min.getTime()) min = dates[i];
    if (t > max.getTime()) max = dates[i];
  }
  const a = formatDdMmYyyy(min);
  const b = formatDdMmYyyy(max);
  if (a === b) return a;
  return `${a} – ${b}`;
}
