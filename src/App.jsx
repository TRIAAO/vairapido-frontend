import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import {
  CompaniesPanel,
  DashboardPage,
  OperatorPanel,
  ReportsPanel,
  UsersPanel
} from "./pages/BackofficePages";
import FiscalPanel from "./pages/FiscalPanel";
import Login from "./pages/Login";
import { isAuthenticated } from "./utils/auth";

const allowedBackofficeRoles = [
  "ADMIN",
  "ROLE_ADMIN",
  "COMPANY_ADMIN",
  "ROLE_COMPANY_ADMIN",
  "OPERATOR",
  "ROLE_OPERATOR"
];

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated() ? (
            <Navigate to="/fiscal" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={allowedBackofficeRoles} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/fiscal" element={<FiscalPanel />} />
          <Route path="/operador" element={<OperatorPanel />} />
          <Route path="/empresas" element={<CompaniesPanel />} />
          <Route path="/usuarios" element={<UsersPanel />} />
          <Route path="/relatorios" element={<ReportsPanel />} />
        </Route>
      </Route>

      <Route
        path="/sem-permissao"
        element={
          <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
            <div className="max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-soft">
              <h1 className="text-3xl font-black text-navy">Acesso negado</h1>
              <p className="mt-3 text-slate-500">
                Seu usuário não possui permissão para acessar este painel.
              </p>
            </div>
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}