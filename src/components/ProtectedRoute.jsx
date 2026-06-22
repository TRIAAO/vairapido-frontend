import { Navigate, Outlet, useLocation } from "react-router-dom";
import { hasAnyRole, isAuthenticated } from "../utils/auth";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return <Navigate to="/sem-permissao" replace />;
  }

  return <Outlet />;
}