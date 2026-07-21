import { logger } from "@/core/logging/logger";

/**
 * @param {string} brand
 * @param {unknown} servicesList
 * @param {(path: string) => Promise<unknown[]>} getStaticServicesJson
 * @param {(b: string) => string} getServicesJsonPath
 */
export async function mergeCatalogWithJson(
  brand,
  servicesList,
  getStaticServicesJson,
  getServicesJsonPath
) {
  if (!Array.isArray(servicesList)) return servicesList;
  try {
    const path = getServicesJsonPath(brand);
    const json = await getStaticServicesJson(path);
    if (!Array.isArray(json) || json.length === 0) return servicesList;

    const codesInList = new Set(
      (servicesList || []).map((s) => s && s.code).filter(Boolean)
    );
    const fromJsonByCode = new Map(
      json.filter((s) => s && s.code != null).map((s) => [s.code, s])
    );
    const addedFromJson = json.filter(
      (s) => s && s.code != null && !codesInList.has(s.code)
    );
    const combined = [...(servicesList || []), ...addedFromJson];

    return combined.map((s) => {
      const fromJson = fromJsonByCode.get(s.code);
      if (!fromJson) return { ...s, point_value: s.point_value ?? 1 };
      const vpt =
        s.vpt != null && s.vpt !== "" && Number(s.vpt) !== 0
          ? s.vpt
          : fromJson.vpt;
      const points =
        s.points != null &&
        !Number.isNaN(parseFloat(s.points)) &&
        parseFloat(s.points) !== 0
          ? s.points
          : fromJson.points;
      const point_value = s.point_value ?? fromJson.point_value ?? 1;
      if (
        vpt === s.vpt &&
        points === s.points &&
        point_value === (s.point_value ?? 1)
      )
        return s;
      return { ...s, vpt, points, point_value };
    });
  } catch (err) {
    logger.warn("Could not merge catalog with JSON", err);
    return servicesList;
  }
}

/**
 * @param {object} deps
 * @param {string} deps.brand
 * @param {boolean} deps.isApiEnabled
 * @param {boolean} deps.hasAuthSession
 * @param {{ get: (k: string) => unknown }} deps.storage
 * @param {Record<string, unknown[]>} deps.cache
 * @param {(brand: string) => Promise<{ services?: unknown[] }>} deps.getServicesOverrides
 * @param {(path: string, options?: object) => Promise<unknown>} deps.apiClientRequest
 * @param {(path: string) => Promise<unknown[]>} deps.getStaticServicesJson
 * @param {(b: string) => string} deps.getServicesJsonPath
 * @param {() => void} [deps.onBeforeJsonFetch]
 */
export async function runLoadServicesCatalog(deps) {
  const {
    brand,
    isApiEnabled,
    hasAuthSession: sessionOk,
    storage,
    cache,
    getServicesOverrides,
    apiClientRequest,
    getStaticServicesJson,
    getServicesJsonPath,
    onBeforeJsonFetch,
  } = deps;

  if (isApiEnabled && sessionOk) {
    try {
      const data = await getServicesOverrides(brand);
      const list = Array.isArray(data.services) ? data.services : [];
      return { kind: "api-ok", list, brand };
    } catch (err) {
      return {
        kind: "api-fail",
        list: [],
        brand,
        message: err?.message ?? String(err),
        err,
      };
    }
  }

  const saved = storage.get(`services_${brand}`);
  if (saved && Array.isArray(saved)) {
    const merged = await mergeCatalogWithJson(
      brand,
      saved,
      getStaticServicesJson,
      getServicesJsonPath
    );
    return { kind: "storage", list: merged, brand };
  }

  if (cache[brand]) {
    return { kind: "cache", list: cache[brand], brand };
  }

  onBeforeJsonFetch?.();
  try {
    let data;
    try {
      data = await getStaticServicesJson(getServicesJsonPath(brand));
    } catch (jsonErr) {
      if (brand === "Lab") {
        const json = await apiClientRequest("/api/v1/services?limit=1000");
        data = json.services ?? [];
      } else {
        throw jsonErr;
      }
    }
    return { kind: "json-ok", list: data, brand };
  } catch (err) {
    return {
      kind: "json-fail",
      list: [],
      brand,
      message: err?.message ?? String(err),
      err,
    };
  }
}
