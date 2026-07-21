/**
 * Shared config for document tabs: category keys, labels, and type matching.
 * Used by TabDocCategory (single-category view).
 */

export const DOC_CATEGORY_KEYS = {
  PHOTOGRAPHIES: "photographies",
  RADIOGRAPHIES: "radiographies",
  DOCUMENTS: "documents",
};

/** Tab id → internal doc type key (for TabDocCategory) */
export const TAB_TO_DOC_TYPE = {
  photographie: DOC_CATEGORY_KEYS.PHOTOGRAPHIES,
  radiographie: DOC_CATEGORY_KEYS.RADIOGRAPHIES,
  "empreinte-3d": "empreinte-3d",
  "autres-documents": DOC_CATEGORY_KEYS.DOCUMENTS,
  documents: DOC_CATEGORY_KEYS.DOCUMENTS,
};

/** Tab id → file input accept (old app: generic for all; we tailor per category) */
export const TAB_ACCEPT = {
  photographie: "image/*,.pdf,.doc,.docx,.stl,.obj,.ply,.3mf",
  radiographie: "image/*,.pdf,.dcm,.dicom,.stl,.obj,.ply,.3mf",
  documents: "image/*,.pdf,.doc,.docx,.stl,.obj,.ply,.3mf",
  "empreinte-3d": ".stl,.obj,.ply,.3mf,.dcm,.dicom,image/*",
};

/** Categories for merged view: key, icon, match(type). Order matches old app. */
export const DOC_CATEGORIES = [
  {
    key: DOC_CATEGORY_KEYS.PHOTOGRAPHIES,
    icon: "fas fa-camera",
    match: (t) =>
      /^(photographies?|photographie|photo|photos|photography)$/.test(t),
  },
  {
    key: DOC_CATEGORY_KEYS.RADIOGRAPHIES,
    icon: "fas fa-x-ray",
    match: (t) => /^(radiographies?|radiographie|radio|x-?ray|xray)$/.test(t),
  },
  {
    key: DOC_CATEGORY_KEYS.DOCUMENTS,
    icon: "fas fa-file-alt",
    match: (t) =>
      !t || /^(documents?|autres?|autre|other|scan|scans|doc)$/.test(t),
  },
  {
    key: "empreinte-3d",
    icon: "fas fa-cube",
    match: (t) => /^(empreinte-3d|empreinte 3d)$/.test(t),
  },
];

function normalizeType(d) {
  return (d.type && String(d.type).toLowerCase()) || "";
}

/**
 * Filter docs that belong to the given doc type key.
 * @param {Array} allDocs
 * @param {string} docType - one of DOC_CATEGORY_KEYS or "empreinte-3d"
 */
export function filterDocsByType(allDocs, docType) {
  const list = Array.isArray(allDocs) ? allDocs : [];
  return list.filter((d) => {
    const t = normalizeType(d);
    if (docType === DOC_CATEGORY_KEYS.PHOTOGRAPHIES)
      return t === "photographies" || t === "photographie";
    if (docType === DOC_CATEGORY_KEYS.RADIOGRAPHIES)
      return t === "radiographies" || t === "radiographie";
    if (docType === "empreinte-3d")
      return t === "empreinte-3d" || t === "empreinte 3d";
    if (docType === DOC_CATEGORY_KEYS.DOCUMENTS)
      return !t || t === "documents" || t === "autres";
    if (docType === "docs-prives")
      return t === "docs-prives" || t === "docs_prives";
    return t === docType;
  });
}

/**
 * Group docs by category (for merged view).
 * @param {Array} docs
 * @returns {{ [key: string]: Array }}
 */
export function groupDocsByCategory(docs) {
  const list = Array.isArray(docs) ? docs : [];
  const result = {};
  for (const cat of DOC_CATEGORIES) {
    result[cat.key] = list.filter((d) => cat.match(normalizeType(d)));
  }
  return result;
}
