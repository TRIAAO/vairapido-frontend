import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import ComingSoon from "./pages/ComingSoon";
import FiscalPanel from "./pages/FiscalPanel";
import Login from "./pages/Login";
import { isAuthenticated } from "./utils/auth";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated() ? <Navigate to="/fiscal" replace /> : <Navigate to="/login" replace />}
      />

      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              "ADMIN",
              "ROLE_ADMIN",
              "COMPANY_ADMIN",
              "ROLE_COMPANY_ADMIN",
              "OPERATOR",
              "ROLE_OPERATOR"
            ]}
          />
        }
      >
        <Route element={<AppLayout />}>
          <Route path="/fiscal" element={<FiscalPanel />} />
          <Route path="/dashboard" element={<ComingSoon title="Dashboard operacional" />} />
          <Route path="/operador" element={<ComingSoon title="Painel do operador" />} />
          <Route path="/empresas" element={<ComingSoon title="Gestão de empresas" />} />
          <Route path="/usuarios" element={<ComingSoon title="Gestão de usuários" />} />
          <Route path="/relatorios" element={<ComingSoon title="Relatórios e indicadores" />} />
        </Route>
      </Route>

      <Route
        path="/sem-permissao"
        element={
          <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
            <div className="vr-card max-w-lg p-8 text-center">
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