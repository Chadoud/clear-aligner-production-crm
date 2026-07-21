/**
 * Routing and auth regression tests.
 * - Redirects: unauthenticated -> /login; role-based defaults
 * - Role access: company vs doctor routes
 * - Section config: getSectionFromPath for deep links
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Routes, Route, Outlet } from "react-router-dom";
import ProtectedRoute from "../components/routing/ProtectedRoute";
import RoleRoute from "../components/routing/RoleRoute";
import RoleBasedRedirect from "../routes/RoleBasedRedirect";
import {
  getSectionFromPath,
  getCaseManagementQuery,
  getCaseManagementState,
} from "../routes/sectionConfig";
import { renderWithRouterAndAuth, setAuthRole, screen } from "./test-utils";

describe("routing and auth", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("ProtectedRoute", () => {
    it("redirects unauthenticated user to /login when visiting /app", () => {
      setAuthRole(null);
      renderWithRouterAndAuth(
        <Routes>
          <Route
            path="/login"
            element={<div data-testid="login-page">Login</div>}
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div data-testid="app-content">App</div>
              </ProtectedRoute>
            }
          />
        </Routes>,
        { initialEntries: ["/app"] }
      );
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
      expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
    });

    it("allows authenticated user to access /app", () => {
      setAuthRole("company");
      renderWithRouterAndAuth(
        <Routes>
          <Route
            path="/login"
            element={<div data-testid="login-page">Login</div>}
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div data-testid="app-content">App</div>
              </ProtectedRoute>
            }
          />
        </Routes>,
        { initialEntries: ["/app"] }
      );
      expect(screen.getByTestId("app-content")).toBeInTheDocument();
      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    });
  });

  describe("RoleBasedRedirect", () => {
    it("redirects company user to /app/company", () => {
      setAuthRole("company");
      renderWithRouterAndAuth(
        <Routes>
          <Route path="/login" element={<div data-testid="login">Login</div>} />
          <Route
            path="/app"
            element={
              <div data-testid="app-shell">
                <Outlet />
              </div>
            }
          >
            <Route index element={<RoleBasedRedirect />} />
            <Route
              path="company"
              element={<div data-testid="company">Company</div>}
            />
          </Route>
        </Routes>,
        { initialEntries: ["/app"] }
      );
      expect(screen.getByTestId("company")).toBeInTheDocument();
    });

    it("redirects doctor user to /app/doctor", () => {
      setAuthRole("doctor");
      renderWithRouterAndAuth(
        <Routes>
          <Route path="/login" element={<div data-testid="login">Login</div>} />
          <Route
            path="/app"
            element={
              <div data-testid="app-shell">
                <Outlet />
              </div>
            }
          >
            <Route index element={<RoleBasedRedirect />} />
            <Route
              path="doctor"
              element={<div data-testid="doctor">Doctor</div>}
            />
          </Route>
        </Routes>,
        { initialEntries: ["/app"] }
      );
      expect(screen.getByTestId("doctor")).toBeInTheDocument();
    });
  });

  describe("RoleRoute", () => {
    it("redirects company user away from /app/doctor to /app/company", () => {
      setAuthRole("company");
      renderWithRouterAndAuth(
        <Routes>
          <Route path="/app" element={<Outlet />}>
            <Route
              path="company"
              element={<div data-testid="company">Company</div>}
            />
            <Route
              path="doctor"
              element={
                <RoleRoute role="doctor">
                  <div data-testid="doctor">Doctor</div>
                </RoleRoute>
              }
            />
          </Route>
        </Routes>,
        { initialEntries: ["/app/doctor"] }
      );
      expect(screen.getByTestId("company")).toBeInTheDocument();
      expect(screen.queryByTestId("doctor")).not.toBeInTheDocument();
    });

    it("redirects doctor user away from /app/company/overview to /app/doctor", () => {
      setAuthRole("doctor");
      renderWithRouterAndAuth(
        <Routes>
          <Route path="/app" element={<Outlet />}>
            <Route path="company" element={<Outlet />}>
              <Route
                path="overview"
                element={
                  <RoleRoute role="company">
                    <div data-testid="overview">Overview</div>
                  </RoleRoute>
                }
              />
            </Route>
            <Route
              path="doctor"
              element={<div data-testid="doctor">Doctor</div>}
            />
          </Route>
        </Routes>,
        { initialEntries: ["/app/company/overview"] }
      );
      expect(screen.getByTestId("doctor")).toBeInTheDocument();
      expect(screen.queryByTestId("overview")).not.toBeInTheDocument();
    });
  });
});

describe("sectionConfig getSectionFromPath", () => {
  it("returns overview for /app/company and /app/company/overview", () => {
    expect(getSectionFromPath("/app/company")).toEqual({
      section: "overview",
      overviewTab: "dashboard",
      scope: "company",
    });
    expect(getSectionFromPath("/app/company/")).toEqual({
      section: "overview",
      overviewTab: "dashboard",
      scope: "company",
    });
    expect(getSectionFromPath("/app/company/overview")).toEqual({
      section: "overview",
      overviewTab: "dashboard",
      scope: "company",
    });
    expect(getSectionFromPath("/app/company/overview/")).toEqual({
      section: "overview",
      overviewTab: "dashboard",
      scope: "company",
    });
  });

  it("returns cabinets list for /app/company/cabinets", () => {
    expect(getSectionFromPath("/app/company/cabinets")).toEqual({
      section: "cabinets",
      cabinetView: "list",
      scope: "company",
    });
  });

  it("returns cabinets new for /app/company/cabinets/new", () => {
    expect(getSectionFromPath("/app/company/cabinets/new")).toEqual({
      section: "cabinets",
      cabinetView: "add",
      scope: "company",
    });
  });

  it("returns cabinet edit with slug for /app/company/cabinets/:slug/edit", () => {
    expect(getSectionFromPath("/app/company/cabinets/foo/edit")).toEqual({
      section: "cabinets",
      cabinetView: "edit",
      cabinetSlug: "foo",
      scope: "company",
    });
  });

  it("returns case-management list tab for /app/company/case-management", () => {
    expect(getSectionFromPath("/app/company/case-management")).toEqual({
      section: "case-management",
      caseTab: "list",
      scope: "company",
    });
    expect(getSectionFromPath("/app/company/case-management/")).toEqual({
      section: "case-management",
      caseTab: "list",
      scope: "company",
    });
  });

  it("returns case-management invoice tab", () => {
    expect(getSectionFromPath("/app/company/case-management/invoice")).toEqual({
      section: "case-management",
      caseTab: "invoice",
      scope: "company",
    });
  });

  it("returns case-management invoices tab", () => {
    expect(getSectionFromPath("/app/company/case-management/invoices")).toEqual(
      {
        section: "case-management",
        caseTab: "invoice-generated",
        scope: "company",
      }
    );
  });

  it("returns case-management new case view", () => {
    expect(getSectionFromPath("/app/company/case-management/new")).toEqual({
      section: "case-management",
      caseView: "new",
      scope: "company",
    });
    expect(getSectionFromPath("/app/doctor/case-management/new")).toEqual({
      section: "case-management",
      caseView: "new",
      scope: "doctor",
    });
  });

  it("returns users list and add from path", () => {
    expect(getSectionFromPath("/app/company/users")).toEqual({
      section: "users",
      userView: "list",
      scope: "company",
    });
    expect(getSectionFromPath("/app/company/users/new")).toEqual({
      section: "users",
      userView: "add",
      scope: "company",
    });
    expect(getSectionFromPath("/app/doctor/users")).toEqual({
      section: "users",
      userView: "list",
      scope: "doctor",
    });
    expect(getSectionFromPath("/app/doctor/users/new")).toEqual({
      section: "users",
      userView: "add",
      scope: "doctor",
    });
    expect(getSectionFromPath("/app/doctor/users/2321")).toEqual({
      section: "users",
      userView: "detail",
      userId: 2321,
      scope: "doctor",
    });
  });

  it("returns overview for non-company app path (e.g. doctor or unknown)", () => {
    expect(getSectionFromPath("/app/doctor")).toEqual({
      section: "overview",
      overviewTab: "dashboard",
      scope: "doctor",
    });
    expect(getSectionFromPath("/app/unknown")).toEqual({
      section: "overview",
      scope: "company",
    });
  });
});

describe("getCaseManagementQuery", () => {
  it("parses tab and patientRef from search", () => {
    expect(getCaseManagementQuery("?tab=invoice&patientRef=E10001")).toEqual({
      tab: "invoice",
      patientRef: "E10001",
    });
    expect(getCaseManagementQuery("?patientRef=98&tab=plan")).toEqual({
      tab: "plan",
      patientRef: "98",
    });
  });

  it("returns default tab and null patientRef when missing", () => {
    const r = getCaseManagementQuery("");
    expect(r.tab).toBe("plan");
    expect(r.patientRef).toBeNull();
  });
});

describe("getCaseManagementState", () => {
  it("returns sheet state when on case-management with query", () => {
    const r = getCaseManagementState(
      "/app/company/case-management",
      "?tab=plan&patientRef=E10001"
    );
    expect(r).toEqual({
      section: "case-management",
      caseTab: "plan",
      patientRefFromQuery: "E10001",
      scope: "company",
    });
  });

  it("returns list when on case-management without patientRef", () => {
    const r = getCaseManagementState("/app/company/case-management", "");
    expect(r).toEqual({
      section: "case-management",
      caseTab: "list",
      patientRefFromQuery: null,
      scope: "company",
    });
  });

  it("returns null for non case-management path", () => {
    expect(getCaseManagementState("/app/company/overview", "")).toBeNull();
  });

  it("returns null for case-management/new", () => {
    expect(
      getCaseManagementState("/app/company/case-management/new", "")
    ).toBeNull();
  });

  it("returns sheet state when on path /case-management/id/:caseId (like old app)", () => {
    const r = getCaseManagementState(
      "/app/company/case-management/id/6309",
      "?tab=treatment"
    );
    expect(r).toEqual({
      section: "case-management",
      caseTab: "treatment",
      patientRefFromQuery: "6309",
      isCaseIdFromPath: true,
      scope: "company",
    });
  });
});
