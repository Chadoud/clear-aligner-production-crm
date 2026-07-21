/**
 * Test utilities: render with Router + AuthProvider.
 * Set sessionStorage to match AuthContext keys so readSession() returns a user with the given role.
 */
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { i18n } from "@/i18n";
import { AuthProvider } from "../context/AuthContext";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "@/constants/authStorage";

export function setAuthRole(role) {
  if (role) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, "test-token");
    sessionStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify({
        id: 1,
        username: "test",
        fullName: "Test User",
        role,
        cabinetId: role === "doctor" ? 1 : null,
      })
    );
  } else {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  }
}

/**
 * Render component with MemoryRouter and AuthProvider.
 * Call setAuthRole() before this to simulate logged-in state.
 * @param {React.ReactElement} ui
 * @param {{ initialEntries?: string[] }} options
 */
export function renderWithRouterAndAuth(ui, options = {}) {
  const { initialEntries = ["/"] } = options;

  function Wrapper({ children }) {
    return (
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </I18nextProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

export * from "@testing-library/react";
