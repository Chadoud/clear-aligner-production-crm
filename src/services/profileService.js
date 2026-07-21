/**
 * Self-profile loading and saving.
 * When VITE_USE_API=true: profile comes from backend (tbl_cabinet for doctor, users for company).
 * When API off: uses localStorage as fallback.
 *
 * @module services/profileService
 */

import { getCabinetBySlug } from "../data/cabinets.js";
import {
  getProfileOverrides,
  setProfileOverrides,
} from "../repositories/ProfileRepository.js";
import { isApiEnabled } from "../config/api.js";

const DEFAULT_PROFILE = {
  name: "",
  legal_name: "",
  email: "",
  address: "",
  zip: "",
  city: "",
};

const DEFAULT_DIRECT_PROFILE = {
  direct_name: "",
  direct_address: "",
  direct_zip: "",
  direct_city: "",
};

function applyAuthProfileFallback(profile, authUser) {
  if (!authUser || typeof authUser !== "object") return profile;
  const out = { ...profile };
  const loginEmail = String(authUser.username ?? "").trim();
  if (loginEmail) {
    out.email = loginEmail;
  }
  if (!String(out.name ?? "").trim()) {
    const fromAuth =
      String(authUser.fullName ?? "").trim() ||
      String(authUser.username ?? "").trim();
    if (fromAuth) out.name = fromAuth;
  }
  return out;
}

/**
 * @param {"company"|"doctor"} scope
 * @param {{ id?: string, name?: string, cabinet?: string } | null} [actor]
 * @param {{ username?: string, fullName?: string | null } | null} [authUser]
 */
export async function getProfile(scope, actor, authUser) {
  const doctorId = scope === "doctor" && actor ? actor.id : null;
  const { overrides, profileImage, profileImageUrl, direct } =
    await getProfileOverrides(scope, doctorId);

  let merged;
  if (isApiEnabled) {
    merged = { ...DEFAULT_PROFILE, ...overrides };
  } else if (scope === "doctor" && actor) {
    const base = getDoctorBase(actor);
    merged = { ...base, ...overrides, email: base.email };
  } else {
    merged = { ...DEFAULT_PROFILE, ...overrides };
  }
  const profile = applyAuthProfileFallback(merged, authUser);

  if (scope !== "company" || !direct) {
    return { ...profile, profileImage, profileImageUrl };
  }

  const esOverrides = direct.overrides ?? {};
  return {
    ...profile,
    profileImage,
    profileImageUrl,
    ...DEFAULT_DIRECT_PROFILE,
    direct_name: esOverrides.name ?? "",
    direct_address: esOverrides.address ?? "",
    direct_zip: esOverrides.zip ?? "",
    direct_city: esOverrides.city ?? "",
    directProfileImage: direct.profileImage ?? null,
    directProfileImageUrl: direct.profileImageUrl ?? null,
  };
}

/**
 * @param {"company"|"doctor"} scope
 * @param {object} data
 * @param {{ id?: string } | null} [actor]
 */
export async function saveProfile(scope, data, actor) {
  const doctorId = scope === "doctor" && actor ? actor.id : null;
  const personalFields = {
    title: data.title,
    birth_date: data.birth_date,
    function: data.function,
    phone: data.phone,
    website: data.website,
  };
  const allowed =
    scope === "doctor"
      ? {
          name: data.name,
          legal_name: data.legal_name,
          ...personalFields,
        }
      : {
          name: data.name,
          first_name: data.first_name,
          last_name: data.last_name,
          ...personalFields,
          address: data.address,
          zip: data.zip,
          city: data.city,
        };
  if (scope === "company") {
    allowed.direct_name = data.direct_name;
    allowed.direct_address = data.direct_address;
    allowed.direct_zip = data.direct_zip;
    allowed.direct_city = data.direct_city;
  }
  const overrides = Object.fromEntries(
    Object.entries(allowed).filter(([, v]) => v !== undefined)
  );
  await setProfileOverrides(scope, doctorId, overrides);
}

function getDoctorBase(actor) {
  const cabinet = getCabinetBySlug(String(actor.id));
  if (!cabinet) {
    return { ...DEFAULT_PROFILE, name: actor.name ?? "" };
  }
  const zipCity = cabinet.zipCity ?? "";
  const [zip = "", ...cityParts] = zipCity.split(" ");
  return {
    name: cabinet.name ?? actor.name ?? "",
    legal_name: cabinet.legalName ?? "",
    email: cabinet.email ?? "",
    address: cabinet.address ?? "",
    zip,
    city: cityParts.join(" "),
  };
}
