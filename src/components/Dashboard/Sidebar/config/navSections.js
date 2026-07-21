import { ROUTES } from "@/routes/sectionConfig";

/**
 * Each nav item uses `labelKey` for visible labels (`t(labelKey)` in the Sidebar).
 * `rightName` / `rightNames` stay as English names from tbl_sidebar (sidebar_name_en)
 * for matching user rights — do not translate those values.
 */
/** Company portal: full nav (Overview, Cabinets, Case management, Doctors Billing, Users). */
export const SECTIONS = [
  {
    id: "overview",
    labelKey: "nav.overview",
    icon: "fas fa-home",
    hasSubmenu: true,
    to: ROUTES.overviewDashboard,
    sub: [
      {
        labelKey: "nav.overviewDashboard",
        icon: "fas fa-chart-line",
        to: ROUTES.overviewDashboard,
        rightName: "Home",
      },
      {
        labelKey: "nav.overviewLastCases",
        icon: "fas fa-list",
        to: ROUTES.overviewLastCases,
        rightName: "Last Cases",
      },
    ],
  },
  {
    id: "cabinets",
    labelKey: "nav.cabinets",
    icon: "fas fa-briefcase-medical",
    hasSubmenu: true,
    sub: [
      {
        labelKey: "nav.cabinetsList",
        icon: "fas fa-clipboard-list",
        to: ROUTES.cabinets,
        rightName: "List of cabinets",
      },
      {
        labelKey: "nav.cabinetsNew",
        icon: "fas fa-plus",
        to: ROUTES.cabinetsNew,
        rightName: "Add new cabinet",
      },
    ],
  },
  {
    id: "case-management",
    labelKey: "nav.caseManagement",
    icon: "fas fa-clipboard",
    hasSubmenu: true,
    sub: [
      {
        labelKey: "nav.caseManagementList",
        icon: "fas fa-stethoscope",
        to: ROUTES.caseManagementList,
        rightNames: ["List of cases", "List of case"],
      },
      {
        labelKey: "nav.caseManagementNew",
        icon: "fas fa-plus",
        to: ROUTES.caseManagementNew,
        rightName: "Add new case",
      },
    ],
  },
  {
    id: "doctors-billing",
    labelKey: "nav.doctorsBilling",
    icon: "fas fa-file-invoice-dollar",
    hasSubmenu: true,
    to: ROUTES.doctorsBillingAll,
    rightName: "Doctors Billing",
    sub: [
      {
        labelKey: "nav.doctorsBillingAll",
        icon: "fas fa-layer-group",
        to: ROUTES.doctorsBillingAll,
      },
      {
        labelKey: "nav.doctorsBillingToBill",
        icon: "fas fa-file-invoice",
        to: ROUTES.doctorsBillingToBill,
      },
      {
        labelKey: "nav.doctorsBillingBilled",
        icon: "fas fa-check-circle",
        to: ROUTES.doctorsBillingBilled,
      },
      {
        labelKey: "nav.doctorsBillingPaid",
        icon: "fas fa-money-check-alt",
        to: ROUTES.doctorsBillingPaid,
      },
    ],
  },
  {
    id: "users",
    labelKey: "nav.users",
    icon: "fas fa-users",
    hasSubmenu: true,
    sub: [
      {
        labelKey: "nav.usersList",
        icon: "fas fa-list",
        to: ROUTES.users,
        rightName: "List of users",
      },
      {
        labelKey: "nav.usersNew",
        icon: "fas fa-plus",
        to: ROUTES.usersNew,
        rightName: "Add new user",
      },
    ],
  },
];

/** Doctor portal: Overview + Case management. Doctors with rights can also see company sections (e.g. Cabinets). */
export const DOCTOR_SECTIONS = [
  {
    id: "overview",
    labelKey: "nav.overview",
    icon: "fas fa-home",
    hasSubmenu: true,
    to: ROUTES.doctorOverviewDashboard,
    sub: [
      {
        labelKey: "nav.overviewDashboard",
        icon: "fas fa-chart-line",
        to: ROUTES.doctorOverviewDashboard,
        rightName: "Home",
      },
      {
        labelKey: "nav.overviewLastCases",
        icon: "fas fa-list",
        to: ROUTES.doctorOverviewLastCases,
        rightName: "Last Cases",
      },
    ],
  },
  {
    id: "case-management",
    labelKey: "nav.caseManagement",
    icon: "fas fa-clipboard",
    hasSubmenu: true,
    sub: [
      {
        labelKey: "nav.caseManagementList",
        icon: "fas fa-stethoscope",
        to: ROUTES.doctorCaseManagementList,
        rightNames: ["List of cases", "List of case"],
      },
      {
        labelKey: "nav.caseManagementNew",
        icon: "fas fa-plus",
        to: ROUTES.doctorCaseManagementNew,
        rightName: "Add new case",
      },
    ],
  },
];
