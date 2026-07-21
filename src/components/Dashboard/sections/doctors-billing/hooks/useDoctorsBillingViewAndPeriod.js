import { useMemo, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildMonthOptions } from "../config/constants";
import { getDefaultDateRangeForBilling } from "../config/dateRangeHelpers";
import {
  isDoctorsBillingPath,
  mergeBillingPeriodIntoSearch,
  parseBillingPeriodFromSearch,
  persistBillingPeriodToSession,
  readBillingPeriodFromSession,
} from "../config/billingPeriodSearchParams";
import {
  getDoctorsBillingRouteForPath,
  getDoctorsBillingViewFromPathname,
} from "@/routes/sectionConfig";

function resolveBillingPeriod(search) {
  const fromUrl = parseBillingPeriodFromSearch(search);
  if (fromUrl.selectedMonth !== "all") return fromUrl;
  const stored = readBillingPeriodFromSession();
  return stored ?? fromUrl;
}

/**
 * @param {{ isCompany: boolean }} params
 */
export function useDoctorsBillingViewAndPeriod({ isCompany }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const canGenerateBill = !!isCompany;
  const canViewToBill = !!isCompany;
  const canViewUpcoming = !isCompany;
  const canViewPaid = true;

  const viewMode = getDoctorsBillingViewFromPathname(pathname) ?? "all";

  const { selectedMonth, dateFrom, dateTo } = useMemo(
    () => resolveBillingPeriod(search),
    [search]
  );

  const applyPeriod = useCallback(
    (nextPeriod, { replace = true, nextPathname = pathname } = {}) => {
      persistBillingPeriodToSession(nextPeriod);
      const nextSearch = mergeBillingPeriodIntoSearch(search, nextPeriod);
      if (nextPathname === pathname && nextSearch === (search || "")) return;
      navigate({ pathname: nextPathname, search: nextSearch }, { replace });
    },
    [navigate, pathname, search]
  );

  const setSelectedMonth = useCallback(
    (month) => {
      applyPeriod({
        selectedMonth: month,
        dateFrom: month === "daterange" ? dateFrom : "",
        dateTo: month === "daterange" ? dateTo : "",
      });
    },
    [applyPeriod, dateFrom, dateTo]
  );

  const setDateFrom = useCallback(
    (from) => {
      applyPeriod({
        selectedMonth,
        dateFrom: from,
        dateTo,
      });
    },
    [applyPeriod, selectedMonth, dateTo]
  );

  const setDateTo = useCallback(
    (to) => {
      applyPeriod({
        selectedMonth,
        dateFrom,
        dateTo: to,
      });
    },
    [applyPeriod, selectedMonth, dateFrom]
  );

  const setViewMode = useCallback(
    (mode) => {
      const route = getDoctorsBillingRouteForPath(pathname, mode);
      applyPeriod(
        { selectedMonth, dateFrom, dateTo },
        { replace: false, nextPathname: route }
      );
    },
    [applyPeriod, pathname, selectedMonth, dateFrom, dateTo]
  );

  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const dateRange = useMemo(() => {
    if (selectedMonth !== "daterange" || !dateFrom || !dateTo) return null;
    return { from: dateFrom, to: dateTo };
  }, [selectedMonth, dateFrom, dateTo]);

  const toggleDateRange = useCallback(() => {
    if (selectedMonth === "daterange") {
      applyPeriod({ selectedMonth: "all", dateFrom: "", dateTo: "" });
      return;
    }
    const { from, to } = getDefaultDateRangeForBilling();
    applyPeriod({ selectedMonth: "daterange", dateFrom: from, dateTo: to });
  }, [applyPeriod, selectedMonth]);

  // Restore period from session when URL has no filter (e.g. sidebar link without query).
  useEffect(() => {
    if (!isDoctorsBillingPath(pathname)) return;
    const fromUrl = parseBillingPeriodFromSearch(search);
    if (fromUrl.selectedMonth !== "all") return;
    const stored = readBillingPeriodFromSession();
    if (!stored || stored.selectedMonth === "all") return;
    const nextSearch = mergeBillingPeriodIntoSearch(search, stored);
    if (nextSearch === (search || "")) return;
    navigate({ pathname, search: nextSearch }, { replace: true });
  }, [pathname, search, navigate]);

  return {
    canGenerateBill,
    canViewToBill,
    canViewUpcoming,
    isCompany,
    canViewPaid,
    viewMode,
    setViewMode,
    selectedMonth,
    setSelectedMonth,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    monthOptions,
    dateRange,
    toggleDateRange,
  };
}
