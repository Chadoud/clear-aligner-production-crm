import { Suspense, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./app/providers";
import ErrorBoundary from "./components/shared/ErrorBoundary/ErrorBoundary";
import PageLoading from "./components/shared/PageLoading/PageLoading";
import {
  markPerformance,
  measurePerformance,
} from "./core/performance/webVitals";
import AppRoutes from "./routes/AppRoutes";

function App() {
  useEffect(() => {
    markPerformance("app-mounted");
    return () => {
      markPerformance("app-unmounted");
      measurePerformance(
        "app-mounted",
        "app-unmounted",
        "app-session-duration"
      );
    };
  }, []);

  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
