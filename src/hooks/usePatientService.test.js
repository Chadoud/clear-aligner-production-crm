/**
 * usePatientService: when API is on, loadPatientData is called once.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePatientService } from "./usePatientService";

const loadPatientDataMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../services/patientDataService.js", () => ({
  loadPatientData: (...args) => loadPatientDataMock(...args),
  getAllPatients: () => [],
  getDoctorPatients: () => [],
  getVisiblePatients: () => [],
  getVisibleDoctorPatients: () => [],
  getPatientByIndex: () => null,
  getPatientByName: () => null,
  getPatientByRef: () => null,
  getPatientByRefForScope: () => null,
  formatPatientForDisplay: (p) => ({
    name: p?.name,
    ref: p?.ref,
    status: "Empty",
    info: [],
  }),
  updatePatient: () => {},
}));

describe("usePatientService", () => {
  beforeEach(() => {
    loadPatientDataMock.mockClear();
  });

  it("calls loadPatientData once on mount", async () => {
    const { result } = renderHook(() => usePatientService());

    await waitFor(() => {
      expect(result.current.service).not.toBeNull();
    });

    await waitFor(() => {
      expect(loadPatientDataMock).toHaveBeenCalledTimes(1);
    });
  });
});
