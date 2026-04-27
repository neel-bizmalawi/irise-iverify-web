import { Navigate } from "react-router-dom";

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const role = localStorage.getItem("role");

  // Not logged in
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Not authorized
  if (!allowedRoles.includes(role)) {
    // Redirect based on role
    if (role === "customer") return <Navigate to="/dashboard" replace />;
    if (role === "employee") return <Navigate to="/training" replace />;
    if (role === "admin") return <Navigate to="/" replace />;

    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RoleProtectedRoute;
