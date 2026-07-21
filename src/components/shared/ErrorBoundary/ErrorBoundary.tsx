import { Component, ReactNode } from "react";
import { logger } from "@/core/logging/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: unknown) {
    logger.error("Unhandled React error", { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or go back to the dashboard.</p>
          <div style={{ display: "flex", gap: "24px", marginTop: "12px" }}>
            <a
              href="/app"
              style={{
                padding: "8px 16px",
                background: "#3498db",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Go to dashboard
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
