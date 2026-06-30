import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import ReportsPanel from "./pages/ReportsPanel";
import DashboardPage from "./pages/DashboardPage";
import OperatorPanel from "./pages/OperatorPanel";
import CompaniesPanel from "./pages/CompaniesPanel";
import RoutesPanel from "./pages/RoutesPanel";
import TripsPanel from "./pages/TripsPanel";
import BookingsPanel from "./pages/BookingsPanel";
import PaymentsPanel from "./pages/PaymentsPanel";
import TicketsPanel from "./pages/TicketsPanel";
import PassengersPanel from "./pages/PassengersPanel";
import WhatsAppPanel from "./pages/WhatsAppPanel";
import FiscalPanel from "./pages/FiscalPanel";
import Login from "./pages/Login";
import UsersPanel from "./pages/UsersPanel";
import { isAuthenticated } from "./utils/auth";

const allBackofficeRoles = [
  "ADMIN",
  "ROLE_ADMIN",
  "COMPANY_ADMIN",
  "ROLE_COMPANY_ADMIN",
  "OPERATOR",
  "ROLE_OPERATOR"
];

const managementRoles = [
  "ADMIN",
  "ROLE_ADMIN",
  "COMPANY_ADMIN",
  "ROLE_COMPANY_ADMIN"
];

const adminOnlyRoles = ["ADMIN", "ROLE_ADMIN"];

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated() ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={allBackofficeRoles} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/fiscal" element={<FiscalPanel />} />
          <Route path="/operador" element={<OperatorPanel />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={managementRoles} />}>
        <Route element={<AppLayout />}>
          <Route path="/empresas" element={<CompaniesPanel />} />
          <Route path="/rotas" element={<RoutesPanel />} />
          <Route path="/viagens" element={<TripsPanel />} />
          <Route path="/reservas" element={<BookingsPanel />} />
          <Route path="/pagamentos" element={<PaymentsPanel />} />
          <Route path="/bilhetes" element={<TicketsPanel />} />
          <Route path="/passageiros" element={<PassengersPanel />} />
          <Route path="/whatsapp" element={<WhatsAppPanel />} />
          <Route path="/relatorios" element={<ReportsPanel />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={adminOnlyRoles} />}>
        <Route element={<AppLayout />}>
          <Route path="/usuarios" element={<UsersPanel />} />
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
