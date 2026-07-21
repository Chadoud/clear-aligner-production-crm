import { getApiUserMessage } from "@/core/errors/getApiUserMessage";

/** @param {import("i18next").TFunction} t */
export function profilePhotoUploadStatusMessages(t) {
  return {
    413: t("errors.uploadTooLarge"),
  };
}

/** @param {unknown} err @param {import("i18next").TFunction} t */
export function getProfilePhotoUploadErrorMessage(err, t) {
  return getApiUserMessage(
    err,
    t("errors.uploadFailed"),
    profilePhotoUploadStatusMessages(t)
  );
}

/** @param {unknown} err @param {import("i18next").TFunction} t */
export function getProfilePhotoRemoveErrorMessage(err, t) {
  return getApiUserMessage(
    err,
    t("errors.removeFailed"),
    profilePhotoUploadStatusMessages(t)
  );
}
