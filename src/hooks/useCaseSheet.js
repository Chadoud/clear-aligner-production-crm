/**
 * Hook: load and update case sheet state for the current patient.
 *
 * - Fetches from the API on mount / patient change.
 * - Auto-saves after changes (debounced ~1.5s). Manual Save still available for immediate save.
 * - Each save overwrites the stored case sheet with the current full state (no additive merge).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCaseSheet,
  updateCaseSheet,
  invalidateCaseSheet,
} from "../services/caseSheetService";

const AUTO_SAVE_DELAY_MS = 1500;

const EMPTY_SHEET = {
  treatmentNotes: "",
  treatments: [],
  planMilestones: [],
  paymentNotes: "",
  chatMessages: [],
  toothModules: {},
  toothComments: {},
  treatmentSteps: {},
  /** Last completed step in simple format, e.g. "17-16" */
  lastCompletedStep: null,
};

/**
 * Case ID for case sheet API — always use case_id (tbl_case.case_id).
 * Matches the old app which uses case_id in URLs (/case/edit/id/{case_id}).
 */
function getCaseId(patient) {
  if (!patient) return null;
  const id = patient.case_id;
  return id != null && Number.isFinite(id) ? String(id) : null;
}

function formatSheetError(err, fallbackMessage) {
  const status = err?.status;
  const msg = err?.message || fallbackMessage;
  return status ? `${msg} (HTTP ${status})` : msg;
}

function normalizeLoadedSheet(data) {
  const sheet = { ...EMPTY_SHEET, ...data };
  if (sheet.strippingV2 == null) {
    delete sheet.strippingV2;
  }
  return sheet;
}

function sheetHasLoadedContent(sheet) {
  if (!sheet || sheet === EMPTY_SHEET) return false;
  return (
    (Array.isArray(sheet.treatments) && sheet.treatments.length > 0) ||
    sheet.strippingV2 != null ||
    (sheet.toothModules && Object.keys(sheet.toothModules).length > 0) ||
    (sheet.treatmentSteps && Object.keys(sheet.treatmentSteps).length > 0) ||
    (sheet.toothComments && Object.keys(sheet.toothComments).length > 0) ||
    sheet.lastCompletedStep != null
  );
}

/**
 * @param {{ ref?: string, case_id?: number } | null} patient - Current patient (must have case_id from API)
 * @param {boolean} [enabled=true] - When false, skips the API fetch (defer until a tab that needs it is active)
 * @returns {{ caseSheet: Object, updateCaseSheet: (updates: Object) => void, saveNow: () => void, refreshCaseSheet: () => void, sheetLoading: boolean, sheetError: string|null, hasUnsavedChanges: boolean, saving: boolean }}
 */
export function useCaseSheet(patient, enabled = true) {
  const caseId = getCaseId(patient);
  const [caseSheet, setCaseSheet] = useState(EMPTY_SHEET);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const latestSheetRef = useRef(EMPTY_SHEET);
  const loadedCaseIdRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const hasUnsavedRef = useRef(false);
  const savingRef = useRef(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshCaseSheet = useCallback(() => {
    if (!caseId) return;
    /** Do not refetch while local edits or an in-flight save would be overwritten. */
    if (hasUnsavedRef.current || savingRef.current) return;
    invalidateCaseSheet(caseId);
    setRefreshTrigger((t) => t + 1);
  }, [caseId]);

  const performSave = useCallback(() => {
    if (!caseId || !hasUnsavedRef.current) return;
    const sheet = latestSheetRef.current;
    if (!sheet) return;
    setSaving(true);
    savingRef.current = true;
    updateCaseSheet(caseId, sheet)
      .then(() => {
        setSheetError(null);
        setHasUnsavedChanges(false);
        hasUnsavedRef.current = false;
      })
      .catch((err) => setSheetError(formatSheetError(err, "Failed to save")))
      .finally(() => {
        setSaving(false);
        savingRef.current = false;
      });
  }, [caseId]);

  useEffect(() => {
    if (!caseId) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      loadedCaseIdRef.current = null;
      setHasUnsavedChanges(false);
      hasUnsavedRef.current = false;
      setCaseSheet(EMPTY_SHEET);
      latestSheetRef.current = EMPTY_SHEET;
      setSheetError(null);
      setSheetLoading(false);
      return;
    }

    if (!enabled) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (hasUnsavedRef.current) {
        performSave();
      }
      /** Keep in-memory sheet when switching to tabs that do not need it. */
      return;
    }

    const alreadyLoadedForCase =
      loadedCaseIdRef.current === caseId &&
      sheetHasLoadedContent(latestSheetRef.current);

    /** Tab switches keep the in-memory sheet; only refetch on case change or explicit refresh. */
    if (alreadyLoadedForCase && refreshTrigger === 0) {
      setSheetLoading(false);
      return;
    }

    let cancelled = false;
    setSheetLoading(true);
    setSheetError(null);

    invalidateCaseSheet(caseId);
    getCaseSheet(caseId)
      .then((data) => {
        if (cancelled) return;
        /** A background refetch must not discard in-flight canvas / sheet edits. */
        if (hasUnsavedRef.current) {
          setSheetLoading(false);
          return;
        }
        const sheet = normalizeLoadedSheet(data);
        loadedCaseIdRef.current = caseId;
        setCaseSheet(sheet);
        latestSheetRef.current = sheet;
        setSheetLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setSheetError(formatSheetError(err, "Failed to load treatment plan"));
        if (!sheetHasLoadedContent(latestSheetRef.current)) {
          setCaseSheet(EMPTY_SHEET);
          latestSheetRef.current = EMPTY_SHEET;
          loadedCaseIdRef.current = null;
        }
        setSheetLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [caseId, refreshTrigger, enabled, performSave]);

  const update = useCallback(
    (updates) => {
      if (!caseId) return;
      const next = { ...latestSheetRef.current, ...updates };
      latestSheetRef.current = next;
      loadedCaseIdRef.current = caseId;
      setCaseSheet(next);
      setHasUnsavedChanges(true);
      hasUnsavedRef.current = true;

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveTimerRef.current = null;
        performSave();
      }, AUTO_SAVE_DELAY_MS);
    },
    [caseId, performSave]
  );

  // Flush pending edits on case change; clear debounce timer
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (hasUnsavedRef.current) {
        performSave();
      }
    };
  }, [caseId, performSave]);

  const saveNow = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    performSave();
  }, [performSave]);

  return {
    caseSheet,
    updateCaseSheet: update,
    saveNow,
    refreshCaseSheet,
    sheetLoading,
    sheetError,
    hasUnsavedChanges,
    saving,
  };
}
