import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
    children: JSX.Element;
    requiredRole: "admin" | "user";
    userRole: "admin" | "user" | null;
}

export const ProtectedRoute = ({ children, requiredRole, userRole }: ProtectedRouteProps) => {
    if (!userRole) return <Navigate to="/login" replace />;
    if (userRole !== requiredRole) return <Navigate to="/unauthorized" replace />;
    return children;
};
