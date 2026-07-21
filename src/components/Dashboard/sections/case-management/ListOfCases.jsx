import { useMemo, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  useVisiblePatients,
  usePatientSheetNavigation,
  usePagination,
  usePatientService,
} from "@/hooks";
import { useDashboard } from "@/context/DashboardContext";
import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import Pagination from "@/components/shared/Pagination/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import {
  attachCaseStatus,
  computeStatusCounts,
  filterPatientsByStatus,
} from "@/services/caseStatusMetrics";
import { getTitleLabel } from "@/services/patientDataService";
import { deleteCase, dispatchPatientsRefresh } from "@/services/caseService";
import { useTranslation } from "react-i18next";
import {
  STATUS_OPTIONS,
  formatCaseDate,
} from "./ListOfCases/config/listOfCasesHelpers";
import "./ListOfCases.css";

export default function ListOfCases() {
  const { t } = useTranslation();
  const { search } = useLocation();
  const { scope } = useDashboard();
  const { loading: dataLoading } = usePatientService();
  const patients = useVisiblePatients();
  const navigateToPatientSheet = usePatientSheetNavigation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchNameRef, setSearchNameRef] = useState("");
  const [cabinetFilter, setCabinetFilter] = useState("");
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Reload patient list when landing on this page (e.g. navigating from a case)
  useEffect(() => {
    dispatchPatientsRefresh();
  }, []);

  // Sync status filter from URL when navigating from Overview "Patiens"
  useEffect(() => {
    const params = new URLSearchParams(search);
    const statusFromUrl = params.get("status");
    if (statusFromUrl && STATUS_OPTIONS.some((o) => o.id === statusFromUrl)) {
      setStatusFilter(statusFromUrl);
    }
  }, [search]);

  const cases = useMemo(() => attachCaseStatus(patients), [patients]);

  const cabinets = useMemo(() => {
    const set = new Set(cases.map((c) => c.cabinet).filter(Boolean));
    return Array.from(set).sort();
  }, [cases]);

  const filteredCases = useMemo(() => {
    let list = filterPatientsByStatus(patients, statusFilter, { scope });
    if (searchNameRef.trim()) {
      const q = searchNameRef.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.ref && String(c.ref).toLowerCase().includes(q))
      );
    }
    if (cabinetFilter) {
      list = list.filter((c) => c.cabinet === cabinetFilter);
    }
    return list;
  }, [patients, statusFilter, searchNameRef, cabinetFilter, scope]);

  const statusCounts = useMemo(
    () => computeStatusCounts(patients, { scope }).counts,
    [patients, scope]
  );

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    start,
    end,
    total,
    paginatedItems,
  } = usePagination(filteredCases, 10);

  const handleShowCase = useCallback(
    (c) => {
      navigateToPatientSheet(c);
    },
    [navigateToPatientSheet]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!caseToDelete?.case_id || deleting) return;
    setDeleting(true);
    try {
      const ok = await deleteCase(caseToDelete.case_id);
      if (ok) setCaseToDelete(null);
    } finally {
      setDeleting(false);
    }
  }, [caseToDelete, deleting]);

  return (
    <section className="dashboard-section list-of-cases">
      <h1 className="section-title list-of-cases-title">
        <i className="fas fa-stethoscope" />
        {t("caseList.title")}
      </h1>

      <div className="list-of-cases-layout">
        <aside className="list-of-cases-filters">
          <div className="list-of-cases-status-filters">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`list-of-cases-status-btn ${statusFilter === opt.id ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter(opt.id);
                  setPage(1);
                }}
              >
                <span>{t(opt.labelKey)}</span>
                <span className="list-of-cases-status-badge">
                  {dataLoading ? (
                    <span className="loc-skeleton-badge" />
                  ) : (
                    (statusCounts[opt.id] ?? 0)
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="list-of-cases-search-fields">
            <label className="list-of-cases-search-label">
              <i className="fas fa-user" />
              <input
                type="text"
                placeholder={t("caseList.searchPlaceholder")}
                value={searchNameRef}
                onChange={(e) => {
                  setSearchNameRef(e.target.value);
                  setPage(1);
                }}
                aria-label={t("caseList.searchAria")}
              />
            </label>
            <label className="list-of-cases-search-label">
              <i className="fas fa-building" />
              <CustomSelect
                value={cabinetFilter}
                onChange={(v) => {
                  setCabinetFilter(v);
                  setPage(1);
                }}
                aria-label={t("caseList.filterCabinetAria")}
                options={[
                  {
                    value: "",
                    label: t("caseList.filterCabinetPlaceholder"),
                  },
                  ...cabinets.map((cab) => ({ value: cab, label: cab })),
                ]}
              />
            </label>
            <button type="button" className="list-of-cases-search-btn">
              {t("caseList.searchButton")}
            </button>
          </div>
        </aside>

        <div className="list-of-cases-main">
          <div className="list-of-cases-cards">
            {dataLoading ? (
              <div className="list-of-cases-loading">
                <LoadingDonut size="lg" message={t("caseList.loading")} />
              </div>
            ) : paginatedItems.length === 0 ? (
              <p className="list-of-cases-empty">{t("caseList.empty")}</p>
            ) : (
              paginatedItems.map((c, index) => (
                <article
                  key={`${c.ref}-${c.name}-${c.entered}-${c.cabinet}-${index}`}
                  className="list-of-cases-card"
                >
                  <div className="list-of-cases-card-header">
                    <span className="list-of-cases-card-name">
                      {getTitleLabel(c.title)
                        ? `${getTitleLabel(c.title)} `
                        : ""}
                      {c.name}
                    </span>
                    <span className="list-of-cases-card-id">#{c.ref}</span>
                  </div>
                  <div className="list-of-cases-card-meta">
                    <span className="list-of-cases-card-status">
                      {(() => {
                        const row = STATUS_OPTIONS.find(
                          (o) => o.id === c.caseStatus
                        );
                        return row ? t(row.labelKey) : c.caseStatus;
                      })()}
                    </span>
                    <span className="list-of-cases-card-date">
                      {t("caseList.datePrefix")} {formatCaseDate(c.entered)}
                    </span>
                    <span className="list-of-cases-card-cabinet">
                      {c.cabinet}
                    </span>
                  </div>
                  <div className="list-of-cases-card-actions">
                    <button
                      type="button"
                      className="list-of-cases-show-btn"
                      onClick={() => handleShowCase(c)}
                    >
                      <i className="fas fa-search" />
                      {t("caseList.show")}
                    </button>
                    <button
                      type="button"
                      className="list-of-cases-delete-btn"
                      onClick={() => setCaseToDelete(c)}
                      title="Delete case"
                      aria-label={`Delete ${c.name}`}
                    >
                      <i className="fas fa-trash" />
                      delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          {total > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              start={start}
              end={end}
              total={total}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              variant="compact"
              className="list-of-cases-pagination"
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!caseToDelete}
        title="Delete case"
        message={
          caseToDelete
            ? `Are you sure you want to delete ${caseToDelete.name} (#${caseToDelete.ref})? This cannot be undone.`
            : ""
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmVariant="danger"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleting && setCaseToDelete(null)}
      />
    </section>
  );
}
