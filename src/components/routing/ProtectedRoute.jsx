import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const LOGIN_PATH = "/login";

/**
 * Renders children only when user is authenticated (has a role).
 * Otherwise redirects to /login, preserving intended location in state.
 */
export default function ProtectedRoute({ children }) {
  const { userType } = useAuth();
  const location = useLocation();

  if (!userType) {
    return <Navigate to={LOGIN_PATH} state={{ from: location }} replace />;
  }

  return children;
}
