import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const COMPANY_DEFAULT = "/app/company";
const DOCTOR_DEFAULT = "/app/doctor";

/**
 * Renders children only when user has the required role.
 * Otherwise redirects to the default route for the current user's role.
 */
export default function RoleRoute({ role, children }) {
  const { userType } = useAuth();

  if (userType !== role) {
    const to = userType === "doctor" ? DOCTOR_DEFAULT : COMPANY_DEFAULT;
    return <Navigate to={to} replace />;
  }

  return children;
}
