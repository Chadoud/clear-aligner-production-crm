/**
 * Client Information Service
 *
 * Service for extracting and parsing client information from the DOM.
 * This abstracts the DOM manipulation logic from components.
 *
 * @module services/clientInfoService
 */

/**
 * Extract client information. When patient is provided, returns structured data directly.
 * Otherwise falls back to DOM parsing.
 *
 * @param {Object|null} [patient] - Selected patient; when provided with name/ref, skips DOM
 * @returns {Object} Client information (name, ref, address, phone, born, email)
 */
export const extractClientInfo = (patient = null) => {
  if (patient != null && (patient.name != null || patient.ref != null)) {
    return {
      name: patient.name ?? "",
      ref: patient.ref ?? "",
      address: patient.address ?? "",
      phone: patient.phone ?? "",
      born: patient.born ?? "",
      email: patient.email ?? "",
    };
  }

  const caseName =
    document
      .querySelector(".case-name, .case-section-name")
      ?.textContent.trim() || "";
  const caseRefElement = document.querySelector(".case-ref, .case-section-ref");
  const caseRef = caseRefElement
    ? caseRefElement.textContent.replace(/ref\s*:\s*|#/g, "").trim()
    : "";
  const caseInfo = document.querySelectorAll(
    ".case-info-item, .case-section-detail"
  );

  let address = "";
  let born = "";
  let email = "";
  let phone = "";

  caseInfo.forEach((item) => {
    const text = item.textContent.trim();
    const field = item.getAttribute("data-field");

    if (field === "born") {
      const bornValue = text.replace(/^Born on\s*/i, "").trim();
      if (bornValue && bornValue.toLowerCase() !== "empty") born = bornValue;
    } else if (field === "email") {
      const emailValue = text.replace(/^Email:\s*/i, "").trim();
      if (emailValue && emailValue.toLowerCase() !== "empty")
        email = emailValue;
    } else if (text.includes("@")) {
      email = text;
    } else if (text.match(/\+?\d[\d\s\-()]+/) && text.length > 5) {
      phone = text;
    } else if (
      text &&
      !field &&
      !text.toLowerCase().includes("empty") &&
      !text.includes("entered on") &&
      !text.includes("Cabinet:") &&
      !text.includes("status:")
    ) {
      if (!address) address = text;
    }
  });

  return {
    name: caseName,
    ref: caseRef,
    address,
    phone,
    born,
    email,
  };
};
