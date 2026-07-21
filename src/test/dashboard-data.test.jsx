/**
 * Dashboard data flow: when patient service returns data, a component that uses it can show counts.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { DashboardProvider } from "../context/DashboardContext";
import { usePatientService } from "../hooks";
import { setAuthRole } from "./test-utils";

const mockPatients = [
  {
    name: "Test Patient",
    ref: "R1",
    cabinet: "Test Cabinet",
    case_status: 7,
    born: "01/01/1990",
    entered: "01/01/2024",
    email: null,
  },
];

vi.mock("../services/patientDataService.js", () => ({
  loadPatientData: vi.fn().mockResolvedValue(undefined),
  getAllPatients: () => mockPatients,
  getDoctorPatients: () => mockPatients,
  getVisiblePatients: () => mockPatients,
  getVisibleDoctorPatients: () => mockPatients,
  getPatientByIndex: (i) => mockPatients[i] ?? null,
  getPatientByName: () => null,
  getPatientByRef: (ref) => mockPatients.find((p) => p.ref === ref) ?? null,
  getPatientByRefForScope: (ref) =>
    mockPatients.find((p) => p.ref === ref) ?? null,
  formatPatientForDisplay: (p) => ({
    name: p?.name,
    ref: p?.ref,
    status: "Empty",
    info: [],
  }),
  updatePatient: () => {},
}));

function TestPatientCount() {
  const { service, loading } = usePatientService();
  if (loading || !service) return <span data-testid="loading">Loading</span>;
  const patients = service.getVisiblePatients();
  return <span data-testid="count">Count: {patients.length}</span>;
}

function Wrapper({ children }) {
  return (
    <MemoryRouter initialEntries={["/app/company/overview"]}>
      <AuthProvider>
        <DashboardProvider scope="company">{children}</DashboardProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("dashboard data flow", () => {
  beforeEach(() => {
    setAuthRole("company");
  });

  it("company user sees patient count when service provides data", async () => {
    render(
      <Wrapper>
        <TestPatientCount />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId("count")).toBeInTheDocument();
    });

    expect(screen.getByText(/Count: 1/)).toBeInTheDocument();
  });
});
