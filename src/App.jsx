import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import InventarioPage from "./pages/Inventario/InventarioPage";
import VentasPage from "./pages/Ventas/VentasPage";
import EncargosPage from "./pages/Encargos/EncargosPage";
import ClientesPage from "./pages/Clientes/ClientesPage";
import ReportesPage from "./pages/Reportes/ReportesPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/inventario" replace />} />
            <Route path="inventario" element={<InventarioPage />} />
            <Route path="ventas" element={<VentasPage />} />
            <Route path="encargos" element={<EncargosPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="reportes" element={<ReportesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
