import {
  updateUserProfileImage,
  type ProfileImageContext,
} from "../repositories/userProfileImageRepository.js";
import { syncMobUsersProfileImage } from "../repositories/mobUsersProfileImageRepository.js";
import { resolveStoredImageUrl } from "../utils/profileImageUrl.js";
import { uploadProfilePhotoToMobileApi } from "./mobileApiProfileService.js";

function parseProfileContext(raw: unknown): ProfileImageContext {
  const v = String(raw ?? "default")
    .trim()
    .toLowerCase();
  return v === "direct" ? "direct" : "default";
}

export async function persistUserProfilePhoto(
  legacyUserId: number,
  role: "company" | "doctor",
  buffer: Buffer,
  originalName: string,
  context: ProfileImageContext = "default"
): Promise<{
  profileImage: string;
  profileImageUrl: string | null;
  context: ProfileImageContext;
}> {
  const uploaded = await uploadProfilePhotoToMobileApi(buffer, originalName);
  const storedPath = uploaded.storedPath;

  const ok = await updateUserProfileImage(legacyUserId, storedPath, context);
  if (!ok) {
    throw Object.assign(new Error("Profile image storage is not configured"), {
      statusCode: 400,
    });
  }
  await syncMobUsersProfileImage(legacyUserId, role, storedPath, context);

  return {
    profileImage: storedPath,
    profileImageUrl:
      uploaded.profileImageUrl || resolveStoredImageUrl(storedPath),
    context,
  };
}

export async function clearUserProfilePhoto(
  legacyUserId: number,
  role: "company" | "doctor",
  context: ProfileImageContext = "default"
): Promise<{
  profileImage: null;
  profileImageUrl: null;
  context: ProfileImageContext;
}> {
  const ok = await updateUserProfileImage(legacyUserId, "", context);
  if (!ok) {
    throw Object.assign(new Error("Profile image storage is not configured"), {
      statusCode: 400,
    });
  }
  await syncMobUsersProfileImage(legacyUserId, role, null, context);
  return { profileImage: null, profileImageUrl: null, context };
}

export { parseProfileContext };
