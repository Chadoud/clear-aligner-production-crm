/**
 * Encapsulates dashboard routing and case-management state from location/params.
 */

import { useMemo, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  getSectionFromPath,
  getCaseManagementState,
  ROUTES,
} from "../routes/sectionConfig";
import {
  canAccessCaseTab,
  DEFAULT_DOCTOR_ALLOWED_TAB,
} from "../utils/cases/index.js";
import { getLastCaseTab } from "../constants/caseManagementTabs";

export function useDashboardRouting(scope) {
  const { pathname, search } = useLocation();
  const { slug } = useParams();
  const navigate = useNavigate();

  const caseMgmtState = useMemo(
    () => getCaseManagementState(pathname, search),
    [pathname, search]
  );
  const pathSection = getSectionFromPath(pathname);
  const section = caseMgmtState ? caseMgmtState.section : pathSection.section;
  let caseTab = caseMgmtState
    ? caseMgmtState.caseTab
    : (pathSection.caseTab ?? "plan");
  const patientRefFromQuery = caseMgmtState?.patientRefFromQuery ?? null;
  const isCaseIdFromPath = caseMgmtState?.isCaseIdFromPath ?? false;
  const isDoctor = scope === "doctor";

  // When viewing a patient with no tab in URL, redirect to add last tab (or plan)
  useEffect(() => {
    if (
      section !== "case-management" ||
      caseTab === "list" ||
      !isCaseIdFromPath
    )
      return;
    const params = new URLSearchParams(search || "");
    if (params.has("tab")) return;
    let tab = getLastCaseTab() || "plan";
    if (isDoctor && !canAccessCaseTab(scope, tab)) {
      tab = DEFAULT_DOCTOR_ALLOWED_TAB;
    }
    params.set("tab", tab);
    const baseUrl = pathname.split("?")[0];
    navigate(`${baseUrl}?${params.toString()}`, { replace: true });
  }, [
    section,
    caseTab,
    isCaseIdFromPath,
    pathname,
    search,
    isDoctor,
    scope,
    navigate,
  ]);

  useEffect(() => {
    if (
      scope !== "doctor" ||
      section !== "case-management" ||
      caseTab === "list"
    )
      return;
    if (canAccessCaseTab(scope, caseTab)) return;
    const params = new URLSearchParams(search);
    params.set("tab", DEFAULT_DOCTOR_ALLOWED_TAB);
    const baseUrl = pathname.split("?")[0];
    navigate(`${baseUrl}?${params.toString()}`, { replace: true });
  }, [
    scope,
    section,
    caseTab,
    pathname,
    search,
    patientRefFromQuery,
    navigate,
  ]);

  const routes = useMemo(
    () =>
      isDoctor
        ? {
            overview: ROUTES.doctorOverview,
            caseManagementList: ROUTES.doctorCaseManagementList,
            caseManagement: ROUTES.doctorCaseManagement,
            caseManagementInvoices: ROUTES.doctorCaseManagementInvoices,
            cabinets: ROUTES.doctorCabinets,
            cabinetsNew: ROUTES.doctorCabinetsNew,
            cabinetEdit: ROUTES.doctorCabinetEdit,
          }
        : {
            overview: ROUTES.overview,
            caseManagementList: ROUTES.caseManagementList,
            caseManagement: ROUTES.caseManagement,
            caseManagementInvoices: ROUTES.caseManagementInvoices,
            cabinets: ROUTES.cabinets,
            cabinetsNew: ROUTES.cabinetsNew,
            cabinetEdit: ROUTES.cabinetEdit,
          },
    [isDoctor]
  );

  const { cabinetView, cabinetSlug, userView, userId, caseView } = pathSection;
  const effectiveCabinetSlug = cabinetSlug ?? slug ?? null;
  const isAddNewCase = caseView === "new";

  return {
    caseMgmtState,
    pathSection,
    section,
    caseTab,
    patientRefFromQuery,
    isCaseIdFromPath,
    routes,
    isDoctor,
    effectiveCabinetSlug,
    isAddNewCase,
    caseView,
    cabinetView,
    userView,
    userId: userId ?? null,
  };
}
