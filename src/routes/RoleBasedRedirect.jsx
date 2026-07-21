import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const COMPANY_DEFAULT = "/app/company";
const DOCTOR_DEFAULT = "/app/doctor";

/**
 * Redirects authenticated user to the default route for their role.
 * Used for /app index route.
 */
export default function RoleBasedRedirect() {
  const { userType } = useAuth();

  if (userType === "doctor") {
    return <Navigate to={DOCTOR_DEFAULT} replace />;
  }
  if (userType === "company") {
    return <Navigate to={COMPANY_DEFAULT} replace />;
  }

  return <Navigate to="/login" replace />;
}
