import { File } from "node:buffer";
import { config } from "../config.js";

export type MobileProfileUploadResult = {
  storedPath: string;
  profileImageUrl: string;
  filename: string;
};

function guessMimeType(filename: string): string {
  const ext = String(filename || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

/**
 * CRM → mobile API: store profile photo in the shared canonical bucket
 * (`mobile API host/uploads/profile/`).
 */
export async function uploadProfilePhotoToMobileApi(
  buffer: Buffer,
  originalName: string,
  mimetype?: string
): Promise<MobileProfileUploadResult> {
  const base = config.mobileApiBaseUrl.replace(/\/$/, "");
  const key = String(config.mobileInternalApiKey || "").trim();
  if (!base || !key) {
    throw Object.assign(
      new Error(
        "Mobile API profile upload is not configured (MOBILE_API_BASE_URL / MOBILE_INTERNAL_API_KEY)"
      ),
      { statusCode: 503 }
    );
  }

  const safeName = String(originalName || "photo.jpg").replace(
    /[^\w.-]+/g,
    "_"
  );
  const type = mimetype?.trim() || guessMimeType(safeName);
  const form = new FormData();
  form.append("file", new File([buffer], safeName, { type }));

  const res = await fetch(`${base}/api/internal/profile-photo`, {
    method: "POST",
    headers: { "X-Internal-Api-Key": key },
    body: form,
  });

  if (!res.ok) {
    const detail = (await res.text()).trim().slice(0, 300);
    throw Object.assign(
      new Error(detail || `Mobile API profile upload failed (${res.status})`),
      { statusCode: res.status >= 400 && res.status < 600 ? res.status : 502 }
    );
  }

  const data = (await res.json()) as {
    storedPath?: string;
    profileImageUrl?: string;
    filename?: string;
  };
  const storedPath = String(data.storedPath ?? "").trim();
  if (!storedPath.startsWith("/uploads/profile/")) {
    throw Object.assign(
      new Error("Mobile API returned an invalid profile path"),
      {
        statusCode: 502,
      }
    );
  }

  const profileImageUrl =
    String(data.profileImageUrl ?? "").trim() || `${base}${storedPath}`;

  return {
    storedPath,
    profileImageUrl,
    filename: String(data.filename ?? storedPath.split("/").pop() ?? ""),
  };
}
