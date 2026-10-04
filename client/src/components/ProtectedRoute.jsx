import { Navigate } from "react-router-dom";
import { getUser } from "../config";

// <ProtectedRoute>            -> any logged-in user
// <ProtectedRoute role="Recruiter"> -> only that role (others are sent to /jobs)
function ProtectedRoute({ children, role }) {

  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role && getUser()?.role !== role) {
    return <Navigate to="/jobs" replace />;
  }

  return children;
}

export default ProtectedRoute;
