import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AuthProvider, useAuth } from "./auth/AuthContext";

const UserApp = lazy(() => import("./user/src/App"));
const AdminApp = lazy(() => import("./administrator/src/App"));
const Login = lazy(() => import("./auth/Login")); // export default
const ChangePassword = lazy(() => import("./user/src/pages/ChangePassword"));

function AppRoutes() {
    const { user } = useAuth();

    return (
        <BrowserRouter>
            <Suspense fallback={<div>Carregando...</div>}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/account/change-password" element={<ChangePassword />} />
                    <Route
                        path="/user/*"
                        element={
                                <UserApp />
                        }
                    />
                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute
                                requiredRole="admin"
                                userRole={user?.role ?? null} // correção
                            >
                                <AdminApp />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
