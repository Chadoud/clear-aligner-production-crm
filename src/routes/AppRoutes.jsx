import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import PageLoading from "@/components/shared/PageLoading/PageLoading";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import RoleRoute from "@/components/routing/RoleRoute";
import RoleBasedRedirect from "@/routes/RoleBasedRedirect";
import { ROUTES } from "@/routes/sectionConfig";
import { InvoiceDataProvider } from "@/context/InvoiceDataContext";

const Login = lazy(() => import("@/pages/Login/Login"));
const ForgotPassword = lazy(
  () => import("@/pages/ForgotPassword/ForgotPassword")
);
const ResetPassword = lazy(() => import("@/pages/ResetPassword/ResetPassword"));
const Dashboard = lazy(() => import("@/components/Dashboard/Dashboard"));

function LoginOrRedirect() {
  const { userType } = useAuth();
  if (userType) return <Navigate to="/app" replace />;
  return <Login />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginOrRedirect />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <InvoiceDataProvider>
              <Outlet />
            </InvoiceDataProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleBasedRedirect />} />
        <Route
          path="doctor"
          element={<Navigate to={ROUTES.doctorOverviewDashboard} replace />}
        />
        <Route
          path="doctor/*"
          element={
            <RoleRoute role="doctor">
              <Suspense fallback={<PageLoading />}>
                <Dashboard />
              </Suspense>
            </RoleRoute>
          }
        />
        {/*
          Flat `company/*` only (like `doctor/*`). Nested `company` + child `path="*"`
          broke pathname updates in Dashboard while the address bar changed. Optional
          `/app/company` → overview dashboard redirect is handled by getSectionFromPath.
        */}
        <Route
          path="company/*"
          element={
            <RoleRoute role="company">
              <Suspense fallback={<PageLoading />}>
                <Dashboard />
              </Suspense>
            </RoleRoute>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
