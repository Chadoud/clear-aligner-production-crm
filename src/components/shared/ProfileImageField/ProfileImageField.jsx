import { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { profileInitials } from "@/utils/profileImageUrl";
import {
  getProfilePhotoRemoveErrorMessage,
  getProfilePhotoUploadErrorMessage,
} from "@/utils/profilePhotoErrors";
import "./ProfileImageField.css";

const MAX_BYTES = 2 * 1024 * 1024;

export default function ProfileImageField({
  label,
  hint,
  imageUrl,
  displayName,
  round = false,
  uploading = false,
  onUpload,
  onRemove,
  canRemove = true,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [loadError, setLoadError] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setLoadError(false);
  }, [imageUrl]);

  const showImage = imageUrl && !loadError;
  const initials = profileInitials(displayName);

  const openPicker = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLocalError("");
    if (!file.type.startsWith("image/")) {
      setLocalError(t("errors.invalidImageType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError(t("errors.uploadTooLarge"));
      return;
    }
    try {
      setLoadError(false);
      await onUpload(file);
    } catch (err) {
      setLocalError(getProfilePhotoUploadErrorMessage(err, t));
    }
  };

  const handleRemove = async () => {
    setLocalError("");
    try {
      setLoadError(false);
      await onRemove?.();
    } catch (err) {
      setLocalError(getProfilePhotoRemoveErrorMessage(err, t));
    }
  };

  return (
    <div className="profile-image-field">
      {label ? <p className="profile-image-field-label">{label}</p> : null}
      <div className="profile-image-field-avatar-wrap">
        <button
          type="button"
          className={`profile-image-field-avatar-btn${round ? " profile-image-field-avatar-btn--round" : ""}`}
          onClick={openPicker}
          disabled={uploading}
          aria-label={label || "Upload photo"}
        >
          {showImage ? (
            <img
              src={imageUrl}
              alt=""
              className="profile-image-field-img"
              onError={() => setLoadError(true)}
            />
          ) : (
            <span className="profile-image-field-initials">{initials}</span>
          )}
        </button>
        {uploading ? (
          <span className="profile-image-field-saving" aria-hidden="true">
            <i className="fas fa-spinner fa-spin" />
          </span>
        ) : null}
      </div>
      <div className="profile-image-field-actions">
        <button
          type="button"
          className="profile-image-field-btn profile-image-field-btn--primary"
          onClick={openPicker}
          disabled={uploading}
        >
          Upload photo
        </button>
        {canRemove && showImage ? (
          <button
            type="button"
            className="profile-image-field-btn profile-image-field-btn--secondary"
            onClick={handleRemove}
            disabled={uploading}
          >
            Remove
          </button>
        ) : null}
      </div>
      {hint ? <p className="profile-image-field-hint">{hint}</p> : null}
      {localError ? (
        <p className="profile-image-field-error" role="alert">
          {localError}
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="profile-image-field-hidden-input"
        onChange={handleFile}
      />
    </div>
  );
}

ProfileImageField.propTypes = {
  label: PropTypes.string,
  hint: PropTypes.string,
  imageUrl: PropTypes.string,
  displayName: PropTypes.string,
  round: PropTypes.bool,
  uploading: PropTypes.bool,
  onUpload: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  canRemove: PropTypes.bool,
};
