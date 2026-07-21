import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRefreshCaseSheetOnMount, useSuivi } from "@/hooks";
import { todayISODate } from "@/utils/dates";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import SingleDatePicker from "@/components/shared/DatePicker/SingleDatePicker";
import { FOLLOW_UP_TYPE_IDS } from "@/constants/followUpTypes";

export default function TabFollowUp({
  patient,
  isReadOnly = false,
  refreshCaseSheet,
}) {
  const { t } = useTranslation();
  useRefreshCaseSheetOnMount(refreshCaseSheet, patient?.case_id);
  const caseId = patient?.case_id;
  const { suivi, loading, error, addEntry, removeEntry } = useSuivi(caseId);
  const today = todayISODate();
  const [suiviText, setSuiviText] = useState("");
  const [suiviType, setSuiviType] = useState("0");
  const [suiviDate, setSuiviDate] = useState(today);
  const [saving, setSaving] = useState(false);

  const typeOptions = useMemo(
    () => [
      { value: "0", label: t("caseMgmt.followUp.selectPlaceholder") },
      ...FOLLOW_UP_TYPE_IDS.map((id) => ({
        value: String(id),
        label: t(`followUpTypes.${id}`),
      })),
    ],
    [t]
  );

  const handleRegister = async () => {
    const text = suiviText.trim();
    if (!text || !caseId) return;
    setSaving(true);
    try {
      const ok = await addEntry({
        text,
        type: parseInt(suiviType, 10) || 0,
        date: suiviDate || today,
      });
      if (ok) {
        setSuiviText("");
        setSuiviType("0");
        setSuiviDate(todayISODate());
      }
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">{t("caseMgmt.followUp.emptyPatient")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="form-section tab-panel tab-panel-loading">
        <LoadingDonut size="md" message={t("caseMgmt.followUp.loading")} />
      </div>
    );
  }

  return (
    <div className="form-section tab-panel">
      <h3 className="tab-panel-title">{t("caseMgmt.followUp.title")}</h3>
      <p className="tab-panel-description">
        {t("caseMgmt.followUp.description", { name: patient.name })}
      </p>

      {error && (
        <p className="tab-panel-error" role="alert">
          {error}
        </p>
      )}

      <div className="tab-followup-input-row">
        <div className="tab-followup-field">
          <SingleDatePicker
            id="suivi_date"
            label={t("caseMgmt.followUp.dateLabel")}
            value={suiviDate}
            onChange={setSuiviDate}
            placeholder="dd.mm.yyyy"
            allowFuture
            disabled={isReadOnly}
          />
        </div>
        <div className="tab-followup-field">
          <label htmlFor="suivi_text">
            {t("caseMgmt.followUp.followUpLabel")}
          </label>
          <input
            id="suivi_text"
            type="text"
            className="form-input"
            value={suiviText}
            onChange={(e) => setSuiviText(e.target.value)}
            placeholder=""
            aria-label={t("caseMgmt.followUp.followUpLabel")}
            disabled={isReadOnly}
          />
        </div>
        <div className="tab-followup-field">
          <label htmlFor="suivi_type">{t("caseMgmt.followUp.typeLabel")}</label>
          <CustomSelect
            id="suivi_type"
            options={typeOptions}
            value={suiviType}
            onChange={setSuiviType}
            placeholder={t("caseMgmt.followUp.selectPlaceholder")}
            aria-label={t("caseMgmt.followUp.typeLabel")}
            className="form-control-width-md"
            disabled={isReadOnly}
          />
        </div>
        <div className="tab-followup-actions">
          {!isReadOnly && (
            <button
              type="button"
              className="btn-base btn-base--primary"
              onClick={handleRegister}
              disabled={!suiviText.trim() || saving}
              aria-busy={saving}
            >
              {saving
                ? t("caseMgmt.followUp.saving")
                : t("caseMgmt.followUp.save")}
            </button>
          )}
        </div>
      </div>

      <div className="tab-followup-log">
        {suivi.length === 0 ? (
          <p className="tab-panel-hint">{t("caseMgmt.followUp.noEntries")}</p>
        ) : (
          <table className="tab-followup-table">
            <thead>
              <tr>
                <th>{t("caseMgmt.followUp.thFollowUp")}</th>
                <th>{t("caseMgmt.followUp.thType")}</th>
                <th>{t("caseMgmt.followUp.thDate")}</th>
                {!isReadOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {suivi.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.text}</td>
                  <td>
                    {t(`followUpTypes.${entry.type}`, {
                      defaultValue: String(entry.type),
                    })}
                  </td>
                  <td>{entry.date}</td>
                  {!isReadOnly && (
                    <td>
                      <button
                        type="button"
                        className="btn-base btn-base--danger btn-sm"
                        onClick={async () => {
                          if (
                            window.confirm(t("caseMgmt.followUp.deleteConfirm"))
                          ) {
                            await removeEntry(entry.id);
                          }
                        }}
                        aria-label={t("caseMgmt.followUp.deleteAria")}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
