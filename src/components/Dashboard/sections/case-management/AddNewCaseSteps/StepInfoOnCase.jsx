import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import SingleDatePicker from "@/components/shared/DatePicker/SingleDatePicker";
import { DEFAULT_BIRTH_DATE_YMD } from "@/constants/defaultBirthDate.js";
import "./steps.css";

export default function StepInfoOnCase({
  data,
  onChange,
  cabinets,
  scope,
  defaultCabinet,
}) {
  const { t } = useTranslation();
  const titleOptions = useMemo(
    () => [
      { value: "", label: t("addNewCase.infoTitleOptionSelect") },
      { value: "0", label: t("addNewCase.infoTitleMr") },
      { value: "1", label: t("addNewCase.infoTitleMrs") },
    ],
    [t]
  );

  const cabinetOptions = useMemo(
    () => [
      { value: "", label: t("addNewCase.infoCabinetPlaceholder") },
      ...cabinets.map((c) => ({ value: c, label: c })),
    ],
    [cabinets, t]
  );

  return (
    <div className="step-content">
      <h2 className="step-heading">
        <i className="fas fa-user-circle" aria-hidden />{" "}
        {t("addNewCase.infoHeading")}
      </h2>
      <p className="step-description">{t("addNewCase.infoIntro")}</p>

      <div className="step-form-row">
        <div className="form-group">
          <label htmlFor="step-title">
            {t("addNewCase.infoTitleLabel")} <span className="required">*</span>
          </label>
          <CustomSelect
            id="step-title"
            value={data.title}
            onChange={(val) => onChange({ title: val })}
            options={titleOptions}
            placeholder={t("addNewCase.infoTitlePlaceholder")}
            aria-label={t("addNewCase.infoTitleAria")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="step-firstname">
            {t("addNewCase.infoFirstNameLabel")}{" "}
            <span className="required">*</span>
          </label>
          <input
            id="step-firstname"
            type="text"
            className="form-input"
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            placeholder={t("addNewCase.infoFirstNamePlaceholder")}
            autoComplete="given-name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="step-lastname">
            {t("addNewCase.infoLastNameLabel")}{" "}
            <span className="required">*</span>
          </label>
          <input
            id="step-lastname"
            type="text"
            className="form-input"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            placeholder={t("addNewCase.infoLastNamePlaceholder")}
            autoComplete="family-name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="step-ref">
            {t("addNewCase.infoRefLabel")} <span className="required">*</span>
          </label>
          <input
            id="step-ref"
            type="text"
            className="form-input"
            value={data.ref || ""}
            onChange={(e) => onChange({ ref: e.target.value })}
            placeholder={t("addNewCase.infoRefPlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="step-form-row-2">
        <div className="form-group">
          <label htmlFor="step-birthday">
            {t("addNewCase.infoBirthdayLabel")}
          </label>
          <SingleDatePicker
            id="step-birthday"
            value={data.birthday}
            onChange={(val) => onChange({ birthday: val })}
            placeholder="dd.mm.yyyy"
            allowFuture={false}
            defaultViewYmd={DEFAULT_BIRTH_DATE_YMD}
          />
        </div>
        <div className="form-group">
          <label htmlFor="step-email">{t("addNewCase.infoEmailLabel")}</label>
          <input
            id="step-email"
            type="email"
            className="form-input"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder={t("addNewCase.infoEmailPlaceholder")}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="step-form-row-2">
        <div className="form-group">
          <label htmlFor="step-address">
            {t("addNewCase.infoAddressLabel")}
          </label>
          <input
            id="step-address"
            type="text"
            className="form-input"
            value={data.address ?? ""}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder={t("addNewCase.infoAddressPlaceholder")}
            autoComplete="street-address"
          />
        </div>
        <div className="form-group">
          <label htmlFor="step-phone">{t("addNewCase.infoPhoneLabel")}</label>
          <input
            id="step-phone"
            type="tel"
            className="form-input"
            value={data.phone ?? ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder={t("addNewCase.infoPhonePlaceholder")}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="step-cabinet">
          {t("addNewCase.infoCabinetLabel")} <span className="required">*</span>
        </label>
        {scope === "doctor" ? (
          <input
            id="step-cabinet"
            type="text"
            className="form-input"
            value={defaultCabinet}
            readOnly
            aria-readonly="true"
          />
        ) : (
          <CustomSelect
            id="step-cabinet"
            value={data.cabinet}
            onChange={(val) => onChange({ cabinet: val })}
            options={cabinetOptions}
            placeholder={t("addNewCase.infoCabinetPlaceholder")}
            aria-label={t("addNewCase.infoCabinetAria")}
          />
        )}
      </div>
    </div>
  );
}
