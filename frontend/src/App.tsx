import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout, { AdminRoute, CustomerRoute } from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AdminPage from "./pages/AdminPage";
import AdminCustomersPage from "./pages/AdminCustomersPage";
import CustomerPage from "./pages/CustomerPage";
import PolicyPage from "./pages/PolicyPage";
import SignInPage from "./pages/SignInPage";
import "./animations.css";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route
                index
                element={
                  <CustomerRoute>
                    <CustomerPage />
                  </CustomerRoute>
                }
              />
              <Route path="policy" element={<PolicyPage />} />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
              <Route
                path="customers"
                element={
                  <AdminRoute>
                    <AdminCustomersPage />
                  </AdminRoute>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
