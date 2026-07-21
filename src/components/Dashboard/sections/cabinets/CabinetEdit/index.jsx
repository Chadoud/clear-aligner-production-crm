import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import {
  getCabinetBySlug,
  loadCabinetsFromApi,
  ensureCabinetBySlug,
} from "@/data/cabinets";
import {
  updateCabinet,
  uploadCabinetLogo,
  removeCabinetLogo,
  fetchCabinetBySlug,
} from "@/services/cabinetService";
import { resolveProfileImageUrl } from "@/utils/profileImageUrl";
import ProfileImageField from "@/components/shared/ProfileImageField/ProfileImageField";
import { fetchUsers } from "@/services/userService";
import { safeLogError } from "@/utils/safeLogError";
import {
  usePagination,
  useSearchFilter,
  useVisiblePatients,
  usePatientSheetNavigation,
} from "@/hooks";
import { formatPatientForDisplay } from "@/services/patientDataService";
import CabinetFormSection from "./components/CabinetFormSection";
import CabinetAddressSection from "./components/CabinetAddressSection";
import CabinetUsersSection from "./components/CabinetUsersSection";
import CabinetCasesSection from "./components/CabinetCasesSection";
import "../CabinetEdit.css";

export default function CabinetEdit({ cabinetSlug, onBack }) {
  const toast = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navigateToPatientSheet = usePatientSheetNavigation();
  const [cabinet, setCabinet] = useState(() => getCabinetBySlug(cabinetSlug));
  const [cabinetLoading, setCabinetLoading] = useState(
    () => !getCabinetBySlug(cabinetSlug)
  );
  const [cabinetUsers, setCabinetUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const visiblePatients = useVisiblePatients();

  useEffect(() => {
    let cancelled = false;
    const cached = getCabinetBySlug(cabinetSlug);
    if (cached) {
      setCabinet(cached);
      setCabinetLoading(false);
      return undefined;
    }

    setCabinetLoading(true);
    ensureCabinetBySlug(cabinetSlug)
      .then((loaded) => {
        if (cancelled) return;
        setCabinet(loaded);
        setCabinetLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCabinet(null);
        setCabinetLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cabinetSlug]);

  const cases = useMemo(() => {
    if (!cabinet) return [];
    const targetCabinet = String(cabinet.name || "")
      .trim()
      .toLowerCase();
    if (!targetCabinet) return [];
    return visiblePatients
      .filter(
        (p) =>
          String(p.cabinet || "")
            .trim()
            .toLowerCase() === targetCabinet
      )
      .map((p) => {
        const formatted = formatPatientForDisplay(p);
        return {
          ref: p.ref,
          case_id: p.case_id,
          name: p.name,
          status: formatted.principalStatus || "—",
          enteringDate: p.entered || "—",
        };
      });
  }, [cabinet, visiblePatients]);

  const filterCase = useCallback((c, q) => {
    return (
      (c.ref && c.ref.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q))
    );
  }, []);

  const {
    query: caseSearch,
    setQuery: setCaseSearch,
    filteredItems: filteredCases,
  } = useSearchFilter(cases, filterCase);

  const {
    page: casePage,
    setPage: setCasePage,
    pageSize: casePageSize,
    setPageSize: setCasePageSize,
    pageCount: casePageCount,
    start: caseStart,
    end: caseEnd,
    total: caseTotal,
    paginatedItems: caseRows,
  } = usePagination(filteredCases, 10);

  const [form, setForm] = useState(() =>
    cabinet
      ? {
          name: cabinet.name,
          legalName: cabinet.legalName,
          telephone: cabinet.telephone,
          fax: cabinet.fax,
          email: cabinet.email,
          website: cabinet.website,
          address: cabinet.address,
          zipCity: cabinet.zipCity,
          country: cabinet.country,
        }
      : {}
  );

  useEffect(() => {
    if (cabinet) {
      setForm({
        name: cabinet.name,
        legalName: cabinet.legalName,
        telephone: cabinet.telephone,
        fax: cabinet.fax,
        email: cabinet.email,
        website: cabinet.website,
        address: cabinet.address,
        zipCity: cabinet.zipCity,
        country: cabinet.country,
      });
    }
  }, [cabinet]);

  useEffect(() => {
    if (!cabinet?.slug) return;
    const cabinetId = parseInt(cabinet.slug, 10);
    if (!Number.isFinite(cabinetId)) return;
    setUsersLoading(true);
    fetchUsers({ cabinet_id: cabinetId, limit: 100 })
      .then(({ users }) => setCabinetUsers(users ?? []))
      .catch(() => setCabinetUsers([]))
      .finally(() => setUsersLoading(false));
  }, [cabinet?.slug]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (!cabinet?.slug) return;
    let cancelled = false;
    fetchCabinetBySlug(cabinet.slug)
      .then((record) => {
        if (cancelled || !record) return;
        const url = record.logoUrl || resolveProfileImageUrl(record.logo);
        setLogoUrl(url || null);
      })
      .catch(() => {
        if (!cancelled) setLogoUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cabinet?.slug]);

  const handleLogoUpload = useCallback(
    async (file) => {
      if (!cabinet?.slug) return;
      setLogoUploading(true);
      try {
        const updated = await uploadCabinetLogo(cabinet.slug, file);
        const url = updated.logoUrl || resolveProfileImageUrl(updated.logo);
        setLogoUrl(url || null);
        await loadCabinetsFromApi();
      } finally {
        setLogoUploading(false);
      }
    },
    [cabinet?.slug]
  );

  const handleLogoRemove = useCallback(async () => {
    if (!cabinet?.slug) return;
    setLogoUploading(true);
    try {
      await removeCabinetLogo(cabinet.slug);
      setLogoUrl(null);
      await loadCabinetsFromApi();
    } finally {
      setLogoUploading(false);
    }
  }, [cabinet?.slug]);

  const handleSave = useCallback(async () => {
    if (!cabinet?.slug) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateCabinet(cabinet.slug, form);
      await loadCabinetsFromApi();
      toast.success(t("toast.changesSaved"));
    } catch (err) {
      safeLogError(err, "Cabinet update failed");
      setSaveError(err?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }, [cabinet?.slug, form, toast, t]);

  if (cabinetLoading) {
    return (
      <section className="dashboard-section cabinet-edit">
        <p className="cabinet-edit-loading">Loading cabinet…</p>
      </section>
    );
  }

  if (!cabinet) {
    return (
      <section className="dashboard-section cabinet-edit">
        <p>Cabinet not found.</p>
        <button type="button" onClick={onBack}>
          ← Back to list
        </button>
      </section>
    );
  }

  return (
    <section className="dashboard-section cabinet-edit">
      <h1 className="section-title cabinet-edit-title">
        <i className="fas fa-pencil-alt"></i>
        Edit
      </h1>
      <div className="cabinet-edit-layout">
        <div className="cabinet-edit-left">
          <ProfileImageField
            label="Cabinet photo"
            hint="Logo visible in the app. Max. 2 MB."
            imageUrl={logoUrl}
            displayName={form.name || cabinet.name}
            uploading={logoUploading}
            onUpload={handleLogoUpload}
            onRemove={handleLogoRemove}
          />
          <div className="cabinet-name-card">
            <span className="cabinet-name-first">
              {form.name || cabinet.name}
            </span>
            <span className="cabinet-name-legal">
              {form.legalName || cabinet.legalName}
            </span>
          </div>
        </div>
        <div className="cabinet-edit-right">
          <CabinetFormSection form={form} onUpdate={update} />
          <CabinetAddressSection form={form} onUpdate={update} />
          <div className="cabinet-section cabinet-save-section">
            {saveError && (
              <div className="cabinet-save-error" role="alert">
                {saveError}
              </div>
            )}
            <button
              type="button"
              className="cabinet-save-btn"
              onClick={handleSave}
              disabled={saving}
              aria-label="Save cabinet changes"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <i className="fas fa-save" aria-hidden />
                  Save changes
                </>
              )}
            </button>
          </div>
          <CabinetUsersSection
            users={cabinetUsers}
            loading={usersLoading}
            onNavigateToUser={(url) => navigate(url)}
          />
          <CabinetCasesSection
            caseSearch={caseSearch}
            setCaseSearch={setCaseSearch}
            casePage={casePage}
            setCasePage={setCasePage}
            casePageSize={casePageSize}
            setPageSize={setCasePageSize}
            casePageCount={casePageCount}
            caseStart={caseStart}
            caseEnd={caseEnd}
            caseTotal={caseTotal}
            caseRows={caseRows}
            onNavigateToPatient={navigateToPatientSheet}
          />
        </div>
      </div>
      <button type="button" className="cabinet-back-btn" onClick={onBack}>
        ← Back to list of cabinets
      </button>
    </section>
  );
}
