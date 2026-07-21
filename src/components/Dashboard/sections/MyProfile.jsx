import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getProfile, saveProfile } from "@/services/profileService";
import {
  uploadProfilePhoto,
  removeProfilePhoto,
} from "@/services/profilePhotoService";
import { resolveProfileImageUrl } from "@/utils/profileImageUrl";
import ProfileImageField from "@/components/shared/ProfileImageField/ProfileImageField";
import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import SingleDatePicker from "@/components/shared/DatePicker/SingleDatePicker";
import { isDualLabProfileAccount } from "@/utils/dualLabProfileAccount";
import { getApiUserMessage } from "@/core/errors/getApiUserMessage";
import "./MyProfile.css";

const serializeForm = (f) =>
  JSON.stringify({
    name: String(f.name ?? "").trim(),
    legal_name: String(f.legal_name ?? "").trim(),
    first_name: String(f.first_name ?? "").trim(),
    last_name: String(f.last_name ?? "").trim(),
    title: String(f.title ?? "").trim(),
    birth_date: String(f.birth_date ?? "").trim(),
    function: String(f.function ?? "").trim(),
    phone: String(f.phone ?? "").trim(),
    website: String(f.website ?? "").trim(),
    address: String(f.address ?? "").trim(),
    zip: String(f.zip ?? "").trim(),
    city: String(f.city ?? "").trim(),
    direct_name: String(f.direct_name ?? "").trim(),
    direct_address: String(f.direct_address ?? "").trim(),
    direct_zip: String(f.direct_zip ?? "").trim(),
    direct_city: String(f.direct_city ?? "").trim(),
  });

const normalizeBirthDate = (value) => {
  const s = String(value ?? "").trim();
  if (!s || s.startsWith("0000")) return "";
  return s.slice(0, 10);
};

const profileToFormState = (profile) => ({
  name: profile.name ?? "",
  legal_name: profile.legal_name ?? "",
  first_name: profile.first_name ?? profile.name ?? "",
  last_name: profile.last_name ?? profile.legal_name ?? "",
  title: profile.title === "2" ? "2" : "1",
  birth_date: normalizeBirthDate(profile.birth_date),
  function: profile.function ?? "",
  phone: profile.phone ?? "",
  website: profile.website ?? "",
  email: profile.email ?? "",
  address: profile.address ?? "",
  zip: profile.zip ?? "",
  city: profile.city ?? "",
  direct_name: profile.direct_name ?? "",
  direct_address: profile.direct_address ?? "",
  direct_zip: profile.direct_zip ?? "",
  direct_city: profile.direct_city ?? "",
});

export default function MyProfile() {
  const { scope, actor } = useDashboard();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const isCompany = scope === "company";
  const isDualLabProfile =
    isCompany && isDualLabProfileAccount({ username: user?.username });
  const [form, setForm] = useState({
    name: "",
    legal_name: "",
    first_name: "",
    last_name: "",
    title: "1",
    birth_date: "",
    function: "",
    phone: "",
    website: "",
    email: "",
    address: "",
    zip: "",
    city: "",
    direct_name: "",
    direct_address: "",
    direct_zip: "",
    direct_city: "",
  });
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [directProfileImageUrl, setDirectProfileImageUrl] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [directPhotoUploading, setDirectPhotoUploading] = useState(false);
  const [error, setError] = useState("");
  const [, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const lastSavedRef = useRef("");
  const saveTimerRef = useRef(null);

  const titleOptions = useMemo(
    () => [
      { value: "1", label: t("addNewCase.infoTitleMr") },
      { value: "2", label: t("addNewCase.infoTitleMrs") },
    ],
    [t]
  );

  const applyProfileToForm = (profile) => {
    const nextForm = profileToFormState(profile);
    setForm(nextForm);
    setProfileImageUrl(
      profile.profileImageUrl || resolveProfileImageUrl(profile.profileImage)
    );
    setDirectProfileImageUrl(
      profile.directProfileImageUrl ||
        resolveProfileImageUrl(profile.directProfileImage)
    );
    lastSavedRef.current = serializeForm(nextForm);
  };

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    getProfile(scope, actor, user).then((profile) => {
      if (!cancelled) {
        applyProfileToForm(profile);
        setLoading(false);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scope, actor, user]);

  useEffect(() => {
    if (!hydrated) return undefined;

    const serialized = serializeForm(form);
    if (serialized === lastSavedRef.current) return undefined;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const hasPersonalName = isCompany
        ? String(form.first_name ?? "").trim()
        : String(form.name ?? "").trim();
      if (!hasPersonalName) return;

      setError("");
      try {
        await saveProfile(scope, form, actor);
        const profile = await getProfile(scope, actor, user);
        applyProfileToForm(profile);
        await refreshUser();
        toast.success(t("toast.profileSaved"));
      } catch (err) {
        const message = getApiUserMessage(err, t("toast.failedToSaveProfile"));
        setError(message);
        toast.error(message);
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [form, hydrated, scope, actor, user, toast, t, isCompany, refreshUser]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleFieldValue = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handlePhotoUpload = async (file, context = "default") => {
    const setUploading =
      context === "direct" ? setDirectPhotoUploading : setPhotoUploading;
    const setUrl =
      context === "direct" ? setDirectProfileImageUrl : setProfileImageUrl;
    setUploading(true);
    setError("");
    try {
      const res = await uploadProfilePhoto(file, context);
      setUrl(res.profileImageUrl || resolveProfileImageUrl(res.profileImage));
      await refreshUser();
      toast.success(t("toast.profileSaved"));
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoRemove = async (context = "default") => {
    const setUploading =
      context === "direct" ? setDirectPhotoUploading : setPhotoUploading;
    const setUrl =
      context === "direct" ? setDirectProfileImageUrl : setProfileImageUrl;
    setUploading(true);
    setError("");
    try {
      await removeProfilePhoto(context);
      setUrl(null);
      await refreshUser();
      toast.success(t("toast.profileSaved"));
    } finally {
      setUploading(false);
    }
  };

  const renderPersonalAccountFields = (options = {}) => {
    const { showChatDisplayName = false } = options;
    return (
      <>
        {showChatDisplayName ? (
          <>
            <div className="my-profile-field-row">
              <div className="my-profile-field">
                <label htmlFor="profile-first-name">First name</label>
                <input
                  id="profile-first-name"
                  type="text"
                  value={form.first_name}
                  onChange={handleChange("first_name")}
                  autoComplete="given-name"
                />
              </div>
              <div className="my-profile-field">
                <label htmlFor="profile-last-name">Last name</label>
                <input
                  id="profile-last-name"
                  type="text"
                  value={form.last_name}
                  onChange={handleChange("last_name")}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="my-profile-field">
              <label htmlFor="profile-name">Display name</label>
              <input
                id="profile-name"
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                autoComplete="organization"
                placeholder="Name visible in chat"
              />
            </div>
          </>
        ) : (
          <div className="my-profile-field-row">
            <div className="my-profile-field">
              <label htmlFor="profile-name">First name</label>
              <input
                id="profile-name"
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                autoComplete="given-name"
              />
            </div>
            <div className="my-profile-field">
              <label htmlFor="profile-legal-name">Last name</label>
              <input
                id="profile-legal-name"
                type="text"
                value={form.legal_name}
                onChange={handleChange("legal_name")}
                autoComplete="family-name"
              />
            </div>
          </div>
        )}
        <div className="my-profile-field-row">
          <div className="my-profile-field my-profile-field--select">
            <label htmlFor="profile-title">
              {t("addNewCase.infoTitleLabel")}
            </label>
            <CustomSelect
              id="profile-title"
              value={form.title}
              onChange={handleFieldValue("title")}
              options={titleOptions}
              placeholder={t("addNewCase.infoTitlePlaceholder")}
              aria-label={t("addNewCase.infoTitleAria")}
              searchable={false}
            />
          </div>
          <div className="my-profile-field my-profile-field--date">
            <SingleDatePicker
              id="profile-birth-date"
              label={t("addNewCase.infoBirthdayLabel")}
              value={form.birth_date}
              onChange={handleFieldValue("birth_date")}
              placeholder="dd.mm.yyyy"
              allowFuture={false}
            />
          </div>
        </div>
        <div className="my-profile-field">
          <label htmlFor="profile-function">Job / function</label>
          <input
            id="profile-function"
            type="text"
            value={form.function}
            onChange={handleChange("function")}
            autoComplete="organization-title"
          />
        </div>
        <div className="my-profile-field-row">
          <div className="my-profile-field">
            <label htmlFor="profile-phone">Phone</label>
            <input
              id="profile-phone"
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              autoComplete="tel"
            />
          </div>
          <div className="my-profile-field">
            <label htmlFor="profile-website">Website</label>
            <input
              id="profile-website"
              type="url"
              value={form.website}
              onChange={handleChange("website")}
              autoComplete="url"
              placeholder="https://"
            />
          </div>
        </div>
      </>
    );
  };

  const renderAddressFields = (prefix = "") => {
    const addressKey = prefix ? `${prefix}address` : "address";
    const zipKey = prefix ? `${prefix}zip` : "zip";
    const cityKey = prefix ? `${prefix}city` : "city";
    const idPrefix = prefix || "profile-";
    return (
      <>
        <div className="my-profile-field">
          <label htmlFor={`${idPrefix}address`}>Address</label>
          <input
            id={`${idPrefix}address`}
            type="text"
            value={form[addressKey]}
            onChange={handleChange(addressKey)}
            autoComplete="street-address"
          />
        </div>
        <div className="my-profile-field-row">
          <div className="my-profile-field">
            <label htmlFor={`${idPrefix}zip`}>ZIP</label>
            <input
              id={`${idPrefix}zip`}
              type="text"
              value={form[zipKey]}
              onChange={handleChange(zipKey)}
              autoComplete="postal-code"
            />
          </div>
          <div className="my-profile-field">
            <label htmlFor={`${idPrefix}city`}>City</label>
            <input
              id={`${idPrefix}city`}
              type="text"
              value={form[cityKey]}
              onChange={handleChange(cityKey)}
              autoComplete="address-level2"
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <section
      className="dashboard-section my-profile"
      aria-labelledby="my-profile-title"
    >
      <h1 id="my-profile-title" className="section-title">
        <i className="fas fa-user" aria-hidden />
        My Profile
      </h1>
      <form className="my-profile-form" onSubmit={(e) => e.preventDefault()}>
        {error && (
          <p className="my-profile-error" role="alert">
            {error}
          </p>
        )}

        {isDualLabProfile ? (
          <>
            <div className="my-profile-context-block">
              <h2 className="my-profile-context-title">Lab profile</h2>
              <p className="my-profile-context-hint">
                Shown to patients from other cabinets in chat.
              </p>
              <ProfileImageField
                label="Profile photo"
                hint="Visible in the app. Max. 2 MB."
                imageUrl={profileImageUrl}
                displayName={form.name || user?.fullName || user?.username}
                round
                uploading={photoUploading}
                onUpload={(file) => handlePhotoUpload(file, "default")}
                onRemove={() => handlePhotoRemove("default")}
              />
              <div className="my-profile-field">
                <label htmlFor="profile-name">Display name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  autoComplete="name"
                  placeholder="Name visible in chat"
                />
                <span className="my-profile-field-hint">
                  Shown to patients in the mobile app chat.
                </span>
              </div>
              {renderAddressFields()}
            </div>

            <div className="my-profile-context-block">
              <h2 className="my-profile-context-title">Direct profile</h2>
              <p className="my-profile-context-hint">
                Shown to Direct-catalog patients in chat.
              </p>
              <ProfileImageField
                label="Profile photo"
                hint="Visible in the app. Max. 2 MB."
                imageUrl={directProfileImageUrl}
                displayName={form.direct_name || form.name || user?.username}
                round
                uploading={directPhotoUploading}
                onUpload={(file) => handlePhotoUpload(file, "direct")}
                onRemove={() => handlePhotoRemove("direct")}
              />
              <div className="my-profile-field">
                <label htmlFor="profile-direct-name">Display name</label>
                <input
                  id="profile-direct-name"
                  type="text"
                  value={form.direct_name}
                  onChange={handleChange("direct_name")}
                  autoComplete="organization"
                  placeholder="Name visible in chat"
                />
                <span className="my-profile-field-hint">
                  Shown to Direct-catalog patients in the mobile app chat.
                </span>
              </div>
              {renderAddressFields("direct_")}
            </div>
          </>
        ) : isCompany ? (
          <>
            <ProfileImageField
              label="Profile photo"
              hint="Visible in the app. Max. 2 MB."
              imageUrl={profileImageUrl}
              displayName={form.name || user?.fullName || user?.username}
              round
              uploading={photoUploading}
              onUpload={(file) => handlePhotoUpload(file, "default")}
              onRemove={() => handlePhotoRemove("default")}
            />
            {renderPersonalAccountFields({ showChatDisplayName: true })}
            {renderAddressFields()}
          </>
        ) : (
          <>
            <ProfileImageField
              label="Profile photo"
              hint="Visible in the app. Max. 2 MB."
              imageUrl={profileImageUrl}
              displayName={
                [form.name, form.legal_name].filter(Boolean).join(" ").trim() ||
                user?.fullName ||
                user?.username
              }
              round
              uploading={photoUploading}
              onUpload={(file) => handlePhotoUpload(file, "default")}
              onRemove={() => handlePhotoRemove("default")}
            />
            {renderPersonalAccountFields()}
            <p className="my-profile-field-hint">
              Practice name, address, and logo are managed under{" "}
              <strong>Cabinets</strong> in the menu.
            </p>
          </>
        )}

        <div className="my-profile-field">
          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            type="email"
            value={form.email}
            readOnly
            aria-readonly="true"
            className="my-profile-email"
          />
          <span className="my-profile-field-hint">
            Email cannot be changed.
          </span>
        </div>
      </form>
    </section>
  );
}
