import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useVisiblePatients,
  usePatientSheetNavigation,
  useDashboardDataReady,
} from "@/hooks";
import { useDashboardInvoiceData } from "@/context/InvoiceDataContext";
import { useDashboard } from "@/context/DashboardContext";
import { ROUTES, getSectionFromPath } from "@/routes/sectionConfig";
import { getBillingTablePatientSheetTab } from "@/constants/caseManagementTabs";
import { formatCHF } from "@/utils/index.js";
import DoctorBillingTable from "../doctor-billing-table";
import Card from "@/components/shared/Card/Card";
import {
  useOverviewInvoices,
  useOverviewPanels,
  useOverviewBilling,
  useOverviewCabinets,
} from "./hooks";
import OverviewCharts from "./components/OverviewCharts";
import OverviewPanelsGrid from "./components/OverviewPanelsGrid";
import DonutFiltersRow from "./components/DonutFiltersRow";
import OverviewDataModeTabs from "./components/OverviewDataModeTabs";
import OverviewFiltersPanel from "./components/OverviewFiltersPanel";
import { computeStatusCounts } from "@/services/caseStatusMetrics";
import {
  computePatientTotals,
  computeInvoiceCountsByCaseStatus,
  computeInvoiceAmountsByCaseStatus,
} from "./config/overviewHelpers";
import { DEFAULT_CASE_STATUS_FILTER } from "./components/filters/CaseStatusFilterDropdown/config/constants";
import { isCaseStatusFilterActive } from "./components/filters/CaseStatusFilterDropdown/config/constants";
import { DEFAULT_STATUS_FILTER } from "./components/filters/PaymentOverviewFiltersDropdown/config/constants";
import "./Overview.css";

const INTERN_CABINET_KEYWORDS = ["lab", "direct"];
const isInternCabinetName = (name = "") =>
  INTERN_CABINET_KEYWORDS.some((k) => String(name).toLowerCase().includes(k));

export default function Overview() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { scope } = useDashboard();
  const { dataLoading } = useDashboardDataReady();
  const patients = useVisiblePatients();
  const { allInvoices: allInvoicesRaw } = useDashboardInvoiceData();
  const { overviewTab = "dashboard" } = getSectionFromPath(pathname);

  const navigateToPatientSheet = usePatientSheetNavigation();
  const billingPatientSheetTab = getBillingTablePatientSheetTab();

  const openPatientFromBillingTable = useCallback(
    (patient) => {
      if (!patient?.ref) return;
      navigateToPatientSheet(patient, { tab: billingPatientSheetTab });
    },
    [navigateToPatientSheet, billingPatientSheetTab]
  );

  const { cabinetNamesForOverviewTable, cabinetNameToSlug } =
    useOverviewCabinets();

  // ─── Unified filter state ──────────────────────────────────────────────────
  // All controls live here; every consumer (cards, donut, payment table) derives
  // its data from the same scopedInvoices produced by useOverviewInvoices.

  const [selectedMonth, setSelectedMonth] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const toggleDateRange = useCallback(() => {
    setSelectedMonth((m) => {
      if (m === "daterange") {
        setDateFrom("");
        setDateTo("");
        return "all";
      }
      // Default to last-month → today when entering range mode.
      const today = new Date();
      const from = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        today.getDate()
      );
      const toYMD = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setDateFrom(toYMD(from));
      setDateTo(toYMD(today));
      return "daterange";
    });
  }, []);

  // null = not yet initialised; treated as "all selected" by consumers.
  const [cabinetFilter, setCabinetFilter] = useState(null);
  const lastCabinetOptionsRef = useRef([]);

  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);

  const [caseStatusFilter, setCaseStatusFilter] = useState(
    DEFAULT_CASE_STATUS_FILTER
  );

  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [dataMode, setDataMode] = useState("invoices");

  const [overviewFiltersOpen, setOverviewFiltersOpen] = useState(false);

  const [donutHover, setDonutHover] = useState(null);
  const [donutTooltipPos, setDonutTooltipPos] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const sync = () => {
      if (mq.matches) setOverviewFiltersOpen(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ─── Data hooks ───────────────────────────────────────────────────────────

  const { invoices, scopedInvoices, invoiceMonthOptions, totals } =
    useOverviewInvoices({
      allInvoices: allInvoicesRaw,
      scope,
      patients,
      cabinetNamesForOverviewTable,
      selectedMonth,
      dateFrom,
      dateTo,
      cabinetFilter,
      statusFilter,
      amountMin,
      amountMax,
      caseStatusFilter,
    });

  const { casesWithStatus, overviewPanelsConfig } = useOverviewPanels({
    patients,
    invoices,
  });

  const {
    getBillingState,
    filteredDoctorBillingRows,
    expandedBillingRowIndices,
    toggleBillingDoctor,
    billingSort,
    handleBillingSort,
    cabinetOptionsForFilter,
  } = useOverviewBilling({
    invoices,
    scopedInvoices,
    cabinetNamesForOverviewTable,
    dataMode,
  });

  const activeOverviewFilterCount = useMemo(() => {
    let count = 0;
    if (selectedMonth !== "all") count += 1;
    if (amountMin !== "" || amountMax !== "") count += 1;
    if (
      cabinetFilter &&
      cabinetOptionsForFilter.length > 0 &&
      cabinetFilter.size < cabinetOptionsForFilter.length
    ) {
      count += 1;
    }
    if (
      statusFilter.leftToPay !== DEFAULT_STATUS_FILTER.leftToPay ||
      statusFilter.paid !== DEFAULT_STATUS_FILTER.paid ||
      statusFilter.pending !== DEFAULT_STATUS_FILTER.pending
    ) {
      count += 1;
    }
    if (isCaseStatusFilterActive(caseStatusFilter)) count += 1;
    return count;
  }, [
    selectedMonth,
    amountMin,
    amountMax,
    cabinetFilter,
    cabinetOptionsForFilter,
    statusFilter,
    caseStatusFilter,
  ]);

  // Initialise cabinet filter to "all selected" once options are known.
  // Also keep "all selected" in sync if options expand during initial page load.
  // Do NOT list cabinetFilter in deps: including it + setCabinetFilter caused an
  // infinite loop (new Set() each run !== prev Set reference → max update depth).
  useEffect(() => {
    if (cabinetOptionsForFilter.length === 0) return;
    const previousOptions = lastCabinetOptionsRef.current;

    setCabinetFilter((prev) => {
      if (prev === null) return new Set(cabinetOptionsForFilter);

      const wasAllSelectedOnPreviousOptions =
        previousOptions.length > 0 &&
        previousOptions.every((name) => prev.has(name));
      if (wasAllSelectedOnPreviousOptions) {
        const next = new Set(cabinetOptionsForFilter);
        if (prev.size === next.size) {
          let same = true;
          for (const name of next) {
            if (!prev.has(name)) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return next;
      }
      return prev;
    });

    lastCabinetOptionsRef.current = cabinetOptionsForFilter;
  }, [cabinetOptionsForFilter]);

  // ─── Derived values ───────────────────────────────────────────────────────

  const hasActiveFilters = useMemo(() => {
    const statusAllActive =
      statusFilter.leftToPay && statusFilter.paid && statusFilter.pending;
    const caseStatusAllActive = Object.values(caseStatusFilter || {}).every(
      (isEnabled) => isEnabled !== false
    );
    const cabinetFiltered =
      cabinetFilter !== null &&
      cabinetFilter.size < cabinetOptionsForFilter.length;
    const dateActive =
      selectedMonth !== "all" &&
      (selectedMonth !== "daterange" || (!!dateFrom && !!dateTo));
    return (
      dateActive ||
      cabinetFiltered ||
      !statusAllActive ||
      !caseStatusAllActive ||
      Number(amountMin) > 0 ||
      Number(amountMax) > 0
    );
  }, [
    statusFilter,
    cabinetFilter,
    cabinetOptionsForFilter.length,
    amountMin,
    amountMax,
    selectedMonth,
    dateFrom,
    dateTo,
    caseStatusFilter,
  ]);

  /**
   * "Total cases" card: unique case_id count from filtered invoices when any
   * filter is active; otherwise falls back to the full patient list count so
   * the card stays meaningful before filters are touched.
   */
  const filteredCasesCount = useMemo(() => {
    if (!hasActiveFilters) return casesWithStatus.length;
    const ids = new Set(
      scopedInvoices.map((inv) => inv.case_id).filter(Boolean)
    );
    return ids.size;
  }, [hasActiveFilters, casesWithStatus.length, scopedInvoices]);

  const patientsForStatusCards = useMemo(() => {
    const isCabinetFilterActive =
      scope === "company" &&
      cabinetFilter !== null &&
      cabinetOptionsForFilter.length > 0 &&
      cabinetFilter.size < cabinetOptionsForFilter.length;
    if (!isCabinetFilterActive) return patients;

    const selected = new Set(
      [...cabinetFilter].map((name) => String(name || "").trim())
    );
    const selectedHasIntern = [...selected].some((name) =>
      isInternCabinetName(name)
    );

    return patients.filter((p) => {
      const patientCabinet = String(p?.cabinet || "").trim();
      if (!patientCabinet) return false;
      if (selected.has(patientCabinet)) return true;
      if (selectedHasIntern && isInternCabinetName(patientCabinet)) return true;
      return false;
    });
  }, [scope, cabinetFilter, cabinetOptionsForFilter, patients]);

  /** Case status bars (Patients panel): direct census of ALL visible patients
   *  by their case_status — uses caseStatusToUiId so keys match bar-chart IDs.
   *  The caseStatusFilter zeros out statuses the user has hidden. */
  const statusCounts = useMemo(() => {
    const raw = computeStatusCounts(patientsForStatusCards, { scope }).counts;
    if (!caseStatusFilter) return raw;
    const result = { ...raw };
    Object.keys(result).forEach((id) => {
      if (caseStatusFilter[id] === false) result[id] = 0;
    });
    return result;
  }, [patientsForStatusCards, scope, caseStatusFilter]);

  const patientTotals = useMemo(
    () => computePatientTotals(scopedInvoices),
    [scopedInvoices]
  );

  const invoiceStatusCounts = useMemo(
    () => computeInvoiceCountsByCaseStatus(scopedInvoices, { scope }, patients),
    [scopedInvoices, scope, patients]
  );
  const invoiceStatusAmounts = useMemo(
    () =>
      computeInvoiceAmountsByCaseStatus(scopedInvoices, { scope }, patients),
    [scopedInvoices, scope, patients]
  );

  // ─── Navigation / UX helpers ─────────────────────────────────────────────

  const caseManagementListRoute =
    scope === "doctor"
      ? ROUTES.doctorCaseManagementList
      : ROUTES.caseManagementList;

  const handleShowAll = useCallback(() => {
    navigate(caseManagementListRoute);
  }, [navigate, caseManagementListRoute]);

  // Payment status cards: same toggle semantics as PaymentOverviewFiltersDropdown checkboxes.
  const togglePaymentStatusFilter = useCallback((key) => {
    setStatusFilter((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const renderPanelItem = useCallback(
    (item, subtitle, options = {}) => {
      const clickable =
        options.clickable && item?.ref && openPatientFromBillingTable;
      const content = (
        <>
          <i className="fas fa-user overview-panel-avatar" />
          <div className="overview-panel-row-content">
            <span className="overview-panel-row-name">{item.name}</span>
            <span className="overview-panel-row-meta">{subtitle}</span>
          </div>
        </>
      );
      if (clickable) {
        return (
          <button
            key={item.ref + item.name}
            type="button"
            className="overview-panel-row overview-panel-row-button"
            onClick={() => openPatientFromBillingTable(item)}
          >
            {content}
          </button>
        );
      }
      return (
        <div
          key={(item?.ref || "") + (item?.name || "")}
          className="overview-panel-row"
        >
          {content}
        </div>
      );
    },
    [openPatientFromBillingTable]
  );

  const { totalPaid, totalLeft, totalPending, totalInvoiced } = totals;
  const isPatientsDataMode = dataMode === "patients";

  return (
    <section className="dashboard-section overview-section">
      <h1 className="section-title">Overview</h1>

      {overviewTab === "dashboard" ? (
        <>
          <div
            className="overview-sticky-toolbar"
            role="region"
            aria-label="Overview filters"
          >
            <OverviewDataModeTabs
              dataMode={dataMode}
              onDataModeChange={setDataMode}
            />

            <OverviewFiltersPanel
              expanded={overviewFiltersOpen}
              onToggle={() => setOverviewFiltersOpen((open) => !open)}
              activeFilterCount={activeOverviewFilterCount}
            >
              <DonutFiltersRow
                scope={scope}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                onToggleDateRange={toggleDateRange}
                monthOptions={invoiceMonthOptions}
                cabinetOptions={cabinetOptionsForFilter}
                cabinetFilter={cabinetFilter}
                onCabinetFilterChange={setCabinetFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                caseStatusFilter={caseStatusFilter}
                onCaseStatusFilterChange={setCaseStatusFilter}
                amountMin={amountMin}
                onAmountMinChange={setAmountMin}
                amountMax={amountMax}
                onAmountMaxChange={setAmountMax}
              />
            </OverviewFiltersPanel>
          </div>

          {/* ── Summary cards — driven by scopedInvoices ── */}
          <div className="card-grid">
            <Card
              clickable
              onClick={handleShowAll}
              aria-label="Total cases – click to open case management list"
            >
              <i className="fas fa-users shared-card-icon" />
              <span className="shared-card-label">Total cases</span>
              <span className="shared-card-value">
                {dataLoading ? (
                  <span className="skeleton-value" />
                ) : (
                  filteredCasesCount
                )}
              </span>
            </Card>
            <Card
              highlight={statusFilter.leftToPay !== false}
              clickable
              onClick={() => togglePaymentStatusFilter("leftToPay")}
              aria-label="Left to pay – toggle in table filter"
              dot
              dotActive={statusFilter.leftToPay !== false}
              dotColor="var(--color-warning)"
            >
              <i className="fas fa-clock shared-card-icon" />
              <span className="shared-card-label">Left to pay</span>
              <span className="shared-card-value">
                {dataLoading ? (
                  <span className="skeleton-value" />
                ) : isPatientsDataMode ? (
                  patientTotals.owedCount
                ) : (
                  formatCHF(totalLeft, { decimals: 0 })
                )}
              </span>
            </Card>
            <Card
              highlight={statusFilter.paid !== false}
              clickable
              onClick={() => togglePaymentStatusFilter("paid")}
              aria-label="Paid – toggle in table filter"
              dot
              dotActive={statusFilter.paid !== false}
              dotColor="var(--color-success)"
            >
              <i className="fas fa-check-circle shared-card-icon" />
              <span className="shared-card-label">Paid</span>
              <span className="shared-card-value">
                {dataLoading ? (
                  <span className="skeleton-value" />
                ) : isPatientsDataMode ? (
                  patientTotals.paidCount
                ) : (
                  formatCHF(totalPaid, { decimals: 0 })
                )}
              </span>
            </Card>
            <Card
              highlight={statusFilter.pending !== false}
              clickable
              onClick={() => togglePaymentStatusFilter("pending")}
              aria-label="Pending – toggle in table filter"
              dot
              dotActive={statusFilter.pending !== false}
              dotColor="#6366f1"
            >
              <i className="fas fa-hourglass-half shared-card-icon" />
              <span className="shared-card-label">Pending</span>
              <span className="shared-card-value">
                {dataLoading ? (
                  <span className="skeleton-value" />
                ) : isPatientsDataMode ? (
                  patientTotals.pendingCount
                ) : (
                  formatCHF(totalPending, { decimals: 0 })
                )}
              </span>
            </Card>
            <Card>
              <i className="fas fa-file-invoice shared-card-icon" />
              <span className="shared-card-label">Invoiced total</span>
              <span className="shared-card-value">
                {dataLoading ? (
                  <span className="skeleton-value" />
                ) : (
                  formatCHF(totalInvoiced, { decimals: 0 })
                )}
              </span>
            </Card>
          </div>

          {/* ── Donut chart — driven by the same scopedInvoices totals ── */}
          <OverviewCharts
            totalInvoiced={totalInvoiced}
            totalPaid={totalPaid}
            totalLeft={totalLeft}
            totalPending={totalPending}
            donutHover={donutHover}
            onDonutHoverChange={setDonutHover}
            donutTooltipPos={donutTooltipPos}
            onDonutTooltipPosChange={setDonutTooltipPos}
            formatCHF={formatCHF}
            statusCounts={statusCounts}
            caseManagementListRoute={caseManagementListRoute}
            onNavigateToStatus={navigate}
            loading={dataLoading}
            mode={dataMode}
            patientTotals={patientTotals}
            invoiceStatusCounts={invoiceStatusCounts}
            invoiceStatusAmounts={invoiceStatusAmounts}
          />

          {/* ── Payment table — also driven by scopedInvoices via useOverviewBilling ── */}
          {(scope === "company" || scope === "doctor") && (
            <DoctorBillingTable
              filteredRows={filteredDoctorBillingRows}
              hasActiveFilters={hasActiveFilters}
              expandedIndex={expandedBillingRowIndices}
              onToggleExpand={toggleBillingDoctor}
              sortBy={billingSort.sortBy}
              sortOrder={billingSort.sortOrder}
              onSort={handleBillingSort}
              formatCHF={formatCHF}
              onRowClick={
                scope === "company"
                  ? (doctorName) => {
                      const slug =
                        cabinetNameToSlug[String(doctorName || "").trim()];
                      if (slug) navigate(ROUTES.cabinetEdit(slug));
                    }
                  : undefined
              }
              onPatientClick={openPatientFromBillingTable}
              getBillingState={getBillingState}
              dataMode={dataMode}
            />
          )}
        </>
      ) : (
        <OverviewPanelsGrid
          panels={overviewPanelsConfig}
          renderPanelItem={renderPanelItem}
          onShowAll={handleShowAll}
        />
      )}
    </section>
  );
}
