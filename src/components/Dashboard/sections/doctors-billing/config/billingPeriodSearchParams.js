import { getDefaultDateRangeForBilling } from "./dateRangeHelpers";

const PERIOD_PARAM = "period";
const FROM_PARAM = "from";
const TO_PARAM = "to";
const SESSION_KEY = "doctorsBillingPeriod";

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string} search - location.search (with or without leading "?")
 * @returns {{ selectedMonth: string, dateFrom: string, dateTo: string }}
 */
export function parseBillingPeriodFromSearch(search = "") {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const period = params.get(PERIOD_PARAM);

  if (!period || period === "all") {
    return { selectedMonth: "all", dateFrom: "", dateTo: "" };
  }

  if (period === "daterange") {
    const from = params.get(FROM_PARAM) || "";
    const to = params.get(TO_PARAM) || "";
    if (ISO_DATE_RE.test(from) && ISO_DATE_RE.test(to)) {
      return { selectedMonth: "daterange", dateFrom: from, dateTo: to };
    }
    const defaults = getDefaultDateRangeForBilling();
    return {
      selectedMonth: "daterange",
      dateFrom: ISO_DATE_RE.test(from) ? from : defaults.from,
      dateTo: ISO_DATE_RE.test(to) ? to : defaults.to,
    };
  }

  if (MONTH_KEY_RE.test(period)) {
    return { selectedMonth: period, dateFrom: "", dateTo: "" };
  }

  return { selectedMonth: "all", dateFrom: "", dateTo: "" };
}

/**
 * @param {{ selectedMonth: string, dateFrom?: string, dateTo?: string }} period
 * @returns {string} query string without leading "?"
 */
export function buildBillingPeriodSearch({
  selectedMonth,
  dateFrom = "",
  dateTo = "",
}) {
  if (!selectedMonth || selectedMonth === "all") return "";

  const params = new URLSearchParams();
  params.set(PERIOD_PARAM, selectedMonth);

  if (selectedMonth === "daterange") {
    if (ISO_DATE_RE.test(dateFrom)) params.set(FROM_PARAM, dateFrom);
    if (ISO_DATE_RE.test(dateTo)) params.set(TO_PARAM, dateTo);
  }

  return params.toString();
}

/**
 * Keep non-period query params (future-proof); replace period/from/to.
 * @param {string} search
 * @param {{ selectedMonth: string, dateFrom?: string, dateTo?: string }} period
 * @returns {string} full search string including "?" or ""
 */
export function mergeBillingPeriodIntoSearch(search = "", period) {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  params.delete(PERIOD_PARAM);
  params.delete(FROM_PARAM);
  params.delete(TO_PARAM);

  const periodSearch = buildBillingPeriodSearch(period);
  if (periodSearch) {
    const periodParams = new URLSearchParams(periodSearch);
    for (const [key, value] of periodParams.entries()) {
      params.set(key, value);
    }
  }

  const next = params.toString();
  return next ? `?${next}` : "";
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isDoctorsBillingPath(pathname = "") {
  return /\/doctors-billing(?:\/|$)/.test(pathname);
}

/**
 * Preserve active billing period when switching sidebar sub-routes.
 * @param {string} pathname
 * @param {string} search
 * @param {string} targetPath
 * @returns {string}
 */
export function readBillingPeriodFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parseBillingPeriodFromSearch(
      `?${buildBillingPeriodSearch({
        selectedMonth: String(parsed.selectedMonth ?? ""),
        dateFrom: parsed.dateFrom ?? "",
        dateTo: parsed.dateTo ?? "",
      })}`
    );
  } catch {
    return null;
  }
}

export function persistBillingPeriodToSession(period) {
  try {
    if (!period?.selectedMonth || period.selectedMonth === "all") {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        selectedMonth: period.selectedMonth,
        dateFrom: period.dateFrom ?? "",
        dateTo: period.dateTo ?? "",
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function doctorsBillingNavTarget(pathname, search, targetPath) {
  if (!isDoctorsBillingPath(pathname)) return targetPath;
  const fromUrl = parseBillingPeriodFromSearch(search);
  const period =
    fromUrl.selectedMonth !== "all"
      ? fromUrl
      : (readBillingPeriodFromSession() ?? fromUrl);
  const periodSearch = buildBillingPeriodSearch(period);
  if (!periodSearch) return targetPath;
  return `${targetPath}?${periodSearch}`;
}
