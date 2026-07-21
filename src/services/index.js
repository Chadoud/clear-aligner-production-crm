/**
 * Services barrel — convenience re-export of the entire public service surface.
 * Direct imports of individual service files remain valid; this barrel is
 * for consumers that prefer a single import source.
 */

export * from "./authService.js";
export * from "./cabinetService.js";
export * from "./caseCreateService.js";
export * from "./caseDocsService.js";
export * from "./caseService.js";
export * from "./caseSheetService.js";
export * from "./caseStatusMetrics.js";
export * from "./clientInfoService.js";
export * from "./deliveryEventsService.js";
export * from "./discussionService.js";
export * from "./doctorIdentityService.js";
export * from "./invoiceDataService.js";
export * from "./loadServicesCatalog.js";
export * from "./patientDataService.js";
export * from "./patientInvoiceSyncGuard.js";
export * from "./profileService.js";
export * from "./suiviService.js";
export * from "./userNotesService.js";
export * from "./userService.js";
