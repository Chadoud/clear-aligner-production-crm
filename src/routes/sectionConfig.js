/**
 * Central config for app section routes.
 * Company dashboard lives under /app/company, doctor under /app/doctor.
 */

import { normalizeCaseManagementTab } from "../constants/caseManagementTabs";

export const APP_BASE = "/app";
export const COMPANY_BASE = "/app/company";
export const DOCTOR_BASE = `${APP_BASE}/doctor`;

export const ROUTES = {
  overview: `${COMPANY_BASE}/overview`,
  overviewDashboard: `${COMPANY_BASE}/overview/dashboard`,
  overviewLastCases: `${COMPANY_BASE}/overview/last-cases`,
  cabinets: `${COMPANY_BASE}/cabinets`,
  cabinetsNew: `${COMPANY_BASE}/cabinets/new`,
  cabinetEdit: (slug) => `${COMPANY_BASE}/cabinets/${slug}/edit`,
  caseManagementList: `${COMPANY_BASE}/case-management`,
  caseManagementNew: `${COMPANY_BASE}/case-management/new`,
  caseManagementCase: (caseId) =>
    `${COMPANY_BASE}/case-management/id/${caseId}`,
  caseManagement: `${COMPANY_BASE}/case-management/invoice`,
  caseManagementInvoices: `${COMPANY_BASE}/case-management/invoices`,
  doctorsBilling: `${COMPANY_BASE}/doctors-billing/all`,
  doctorsBillingAll: `${COMPANY_BASE}/doctors-billing/all`,
  doctorsBillingBilled: `${COMPANY_BASE}/doctors-billing/billed`,
  doctorsBillingPaid: `${COMPANY_BASE}/doctors-billing/paid`,
  doctorsBillingToBill: `${COMPANY_BASE}/doctors-billing/bill`,
  users: `${COMPANY_BASE}/users`,
  usersNew: `${COMPANY_BASE}/users/new`,
  userDetail: (id) => `${COMPANY_BASE}/users/${id}`,
  profile: `${COMPANY_BASE}/profile`,
  doctor: DOCTOR_BASE,
  doctorOverview: `${DOCTOR_BASE}/overview`,
  doctorProfile: `${DOCTOR_BASE}/profile`,
  doctorOverviewDashboard: `${DOCTOR_BASE}/overview/dashboard`,
  doctorOverviewLastCases: `${DOCTOR_BASE}/overview/last-cases`,
  doctorCaseManagementList: `${DOCTOR_BASE}/case-management`,
  doctorCaseManagementNew: `${DOCTOR_BASE}/case-management/new`,
  doctorCaseManagementCase: (caseId) =>
    `${DOCTOR_BASE}/case-management/id/${caseId}`,
  doctorCaseManagement: `${DOCTOR_BASE}/case-management/invoice`,
  doctorCaseManagementInvoices: `${DOCTOR_BASE}/case-management/invoices`,
  doctorCabinets: `${DOCTOR_BASE}/cabinets`,
  doctorCabinetsNew: `${DOCTOR_BASE}/cabinets/new`,
  doctorCabinetEdit: (slug) => `${DOCTOR_BASE}/cabinets/${slug}/edit`,
  doctorDoctorsBilling: `${DOCTOR_BASE}/doctors-billing/all`,
  doctorDoctorsBillingAll: `${DOCTOR_BASE}/doctors-billing/all`,
  doctorDoctorsBillingBilled: `${DOCTOR_BASE}/doctors-billing/billed`,
  doctorDoctorsBillingPaid: `${DOCTOR_BASE}/doctors-billing/paid`,
  doctorDoctorsBillingUpcoming: `${DOCTOR_BASE}/doctors-billing/bill`,
  doctorUsers: `${DOCTOR_BASE}/users`,
  doctorUsersNew: `${DOCTOR_BASE}/users/new`,
  doctorUserDetail: (id) => `${DOCTOR_BASE}/users/${id}`,
};

/** @typedef {"all"|"billed"|"paid"|"bill"} DoctorsBillingView */

const DOCTORS_BILLING_VIEW_PATTERN =
  /^\/doctors-billing(?:\/(all|billed|paid|bill))?\/?$/;

/**
 * @param {string} pathname - full app pathname
 * @returns {DoctorsBillingView|null}
 */
export function getDoctorsBillingViewFromPathname(pathname) {
  const rest = pathname.startsWith(DOCTOR_BASE)
    ? pathname.slice(DOCTOR_BASE.length)
    : pathname.startsWith(COMPANY_BASE)
      ? pathname.slice(COMPANY_BASE.length)
      : null;
  if (rest == null) return null;
  const path = rest.startsWith("/") ? rest : `/${rest}`;
  const match = path.match(DOCTORS_BILLING_VIEW_PATTERN);
  if (!match) return null;
  return /** @type {DoctorsBillingView} */ (match[1] || "all");
}

/**
 * @param {string} pathname
 * @param {DoctorsBillingView} view
 * @returns {string}
 */
export function getDoctorsBillingRouteForPath(pathname, view) {
  const base = pathname.startsWith(DOCTOR_BASE)
    ? `${DOCTOR_BASE}/doctors-billing`
    : `${COMPANY_BASE}/doctors-billing`;
  return `${base}/${view}`;
}

/**
 * Users list / detail URLs depend on portal (company vs doctor).
 * @param {string} pathname - location.pathname
 */
export function getUsersRoutes(pathname) {
  const onDoctor = pathname.startsWith(DOCTOR_BASE);
  return onDoctor
    ? {
        users: ROUTES.doctorUsers,
        usersNew: ROUTES.doctorUsersNew,
        userDetail: ROUTES.doctorUserDetail,
      }
    : {
        users: ROUTES.users,
        usersNew: ROUTES.usersNew,
        userDetail: ROUTES.userDetail,
      };
}

/** Cabinet deep link respects portal (company vs doctor). */
export function getCabinetEditRoute(pathname, slug) {
  return pathname.startsWith(DOCTOR_BASE)
    ? ROUTES.doctorCabinetEdit(slug)
    : ROUTES.cabinetEdit(slug);
}

/**
 * @param {string} pathname
 * @returns {{ section: string, cabinetView?: string, cabinetSlug?: string, userView?: string, caseTab?: string, scope?: 'company'|'doctor' }}
 */
export function getSectionFromPath(pathname) {
  const doctorPrefix = "/app/doctor";
  if (pathname.startsWith(doctorPrefix)) {
    return getDoctorSectionFromPath(pathname);
  }
  const companyPrefix = "/app/company";
  if (!pathname.startsWith(companyPrefix)) {
    return { section: "overview", scope: "company" };
  }
  const rest = pathname.slice(companyPrefix.length) || "/";
  const path = rest.startsWith("/") ? rest : `/${rest}`;

  if (path.startsWith("/cabinets/")) {
    if (path.endsWith("/new")) {
      return { section: "cabinets", cabinetView: "add", scope: "company" };
    }
    const editMatch = path.match(/^\/cabinets\/([^/]+)\/edit\/?$/);
    if (editMatch) {
      return {
        section: "cabinets",
        cabinetView: "edit",
        cabinetSlug: editMatch[1],
        scope: "company",
      };
    }
    return { section: "cabinets", cabinetView: "list", scope: "company" };
  }
  if (path === "/cabinets" || path === "/cabinets/") {
    return { section: "cabinets", cabinetView: "list", scope: "company" };
  }
  if (path.startsWith("/case-management")) {
    if (path === "/case-management/new" || path === "/case-management/new/") {
      return { section: "case-management", caseView: "new", scope: "company" };
    }
    const caseIdMatch = path.match(/^\/case-management\/id\/(\d+)\/?$/);
    if (caseIdMatch) {
      return {
        section: "case-management",
        caseTab: "plan",
        caseIdFromPath: caseIdMatch[1],
        scope: "company",
      };
    }
    if (path === "/case-management" || path === "/case-management/") {
      return { section: "case-management", caseTab: "list", scope: "company" };
    }
    const tab = path.includes("/invoices") ? "invoice-generated" : "invoice";
    return { section: "case-management", caseTab: tab, scope: "company" };
  }
  if (DOCTORS_BILLING_VIEW_PATTERN.test(path)) {
    const billingView = getDoctorsBillingViewFromPathname(pathname);
    return { section: "doctors-billing", billingView, scope: "company" };
  }
  if (path === "/users/new") {
    return { section: "users", userView: "add", scope: "company" };
  }
  if (path === "/users" || path === "/users/") {
    return { section: "users", userView: "list", scope: "company" };
  }
  const userDetailMatch = path.match(/^\/users\/(\d+)\/?$/);
  if (userDetailMatch) {
    return {
      section: "users",
      userView: "detail",
      userId: Number(userDetailMatch[1]),
      scope: "company",
    };
  }
  if (path === "/profile" || path === "/profile/") {
    return { section: "profile", scope: "company" };
  }
  if (path.startsWith("/overview")) {
    const overviewTab =
      path === "/overview/last-cases" || path === "/overview/last-cases/"
        ? "lastCases"
        : "dashboard";
    return { section: "overview", overviewTab, scope: "company" };
  }
  if (path === "/" || path === "") {
    return { section: "overview", overviewTab: "dashboard", scope: "company" };
  }
  return { section: "overview", overviewTab: "dashboard", scope: "company" };
}

/**
 * Parses case-management query params. Use when pathname is case-management.
 * @param {string} search - location.search
 * @returns {{ tab: string, patientRef: string | null }}
 */
export function getCaseManagementQuery(search) {
  const params = new URLSearchParams(search || "");
  const tab = normalizeCaseManagementTab(params.get("tab") || null);
  const patientRef = params.get("patientRef")?.trim() || null;
  return { tab, patientRef };
}

/**
 * Resolves effective case-management state from pathname + search.
 * Case ID comes from path /case-management/id/:caseId (like old app) or query patientRef (legacy).
 * @param {string} pathname
 * @param {string} search
 * @returns {{ section: string, caseTab: string, patientRefFromQuery: string | null, scope: 'company'|'doctor' } | null}
 */
export function getCaseManagementState(pathname, search) {
  const isCompany = pathname.startsWith("/app/company");
  const isDoctor = pathname.startsWith("/app/doctor");
  if (!isCompany && !isDoctor) return null;
  const rest =
    pathname.slice(isDoctor ? DOCTOR_BASE.length : COMPANY_BASE.length) || "/";
  const path = rest.startsWith("/") ? rest : `/${rest}`;
  if (!path.startsWith("/case-management")) return null;
  if (path === "/case-management/new" || path === "/case-management/new/")
    return null;
  const { tab, patientRef } = getCaseManagementQuery(search);
  const scope = isDoctor ? "doctor" : "company";

  // Path-based case ID: /case-management/id/6309 (like old app)
  // Look up by case_id (not ref) to avoid wrong patient when ref is numeric
  const caseIdMatch = path.match(/^\/case-management\/id\/(\d+)\/?$/);
  if (caseIdMatch) {
    return {
      section: "case-management",
      caseTab: tab || "plan",
      patientRefFromQuery: caseIdMatch[1],
      isCaseIdFromPath: true,
      scope,
    };
  }

  if (path === "/case-management" || path === "/case-management/") {
    if (patientRef) {
      return {
        section: "case-management",
        caseTab: tab,
        patientRefFromQuery: patientRef,
        scope,
      };
    }
    return {
      section: "case-management",
      caseTab: "list",
      patientRefFromQuery: null,
      scope,
    };
  }
  const pathTab = path.includes("/invoices") ? "invoice-generated" : "invoice";
  return {
    section: "case-management",
    caseTab: pathTab,
    patientRefFromQuery: patientRef,
    scope,
  };
}

/**
 * @param {string} pathname
 * @returns {{ section: string, caseTab?: string, scope: 'doctor' }}
 */
export function getDoctorSectionFromPath(pathname) {
  const rest = pathname.slice(DOCTOR_BASE.length) || "/";
  const path = rest.startsWith("/") ? rest : `/${rest}`;
  if (path.startsWith("/overview") || path === "/" || path === "") {
    const overviewTab =
      path === "/overview/last-cases" || path === "/overview/last-cases/"
        ? "lastCases"
        : "dashboard";
    return { section: "overview", overviewTab, scope: "doctor" };
  }
  if (path.startsWith("/case-management")) {
    if (path === "/case-management/new" || path === "/case-management/new/") {
      return { section: "case-management", caseView: "new", scope: "doctor" };
    }
    const caseIdMatch = path.match(/^\/case-management\/id\/(\d+)\/?$/);
    if (caseIdMatch) {
      return {
        section: "case-management",
        caseTab: "plan",
        caseIdFromPath: caseIdMatch[1],
        scope: "doctor",
      };
    }
    if (path === "/case-management" || path === "/case-management/") {
      return { section: "case-management", caseTab: "list", scope: "doctor" };
    }
    const tab = path.includes("/invoices") ? "invoice-generated" : "invoice";
    return { section: "case-management", caseTab: tab, scope: "doctor" };
  }
  if (path === "/profile" || path === "/profile/") {
    return { section: "profile", scope: "doctor" };
  }
  if (DOCTORS_BILLING_VIEW_PATTERN.test(path)) {
    const billingView = getDoctorsBillingViewFromPathname(pathname);
    return { section: "doctors-billing", billingView, scope: "doctor" };
  }
  if (path === "/users/new" || path === "/users/new/") {
    return { section: "users", userView: "add", scope: "doctor" };
  }
  if (path === "/users" || path === "/users/") {
    return { section: "users", userView: "list", scope: "doctor" };
  }
  const userDetailMatchDoctor = path.match(/^\/users\/(\d+)\/?$/);
  if (userDetailMatchDoctor) {
    return {
      section: "users",
      userView: "detail",
      userId: Number(userDetailMatchDoctor[1]),
      scope: "doctor",
    };
  }
  if (path.startsWith("/cabinets")) {
    if (path.endsWith("/new") || path.endsWith("/new/")) {
      return { section: "cabinets", cabinetView: "add", scope: "doctor" };
    }
    const editMatch = path.match(/^\/cabinets\/([^/]+)\/edit\/?$/);
    if (editMatch) {
      return {
        section: "cabinets",
        cabinetView: "edit",
        cabinetSlug: editMatch[1],
        scope: "doctor",
      };
    }
    return { section: "cabinets", cabinetView: "list", scope: "doctor" };
  }
  return { section: "overview", scope: "doctor" };
}
