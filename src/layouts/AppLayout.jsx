import {
  Bus,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  FileBarChart,
  Building2
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../utils/auth";

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

const adminOnlyRoles = [
  "ADMIN",
  "ROLE_ADMIN"
];

const links = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: allBackofficeRoles
  },
  {
    label: "Fiscal",
    path: "/fiscal",
    icon: ShieldCheck,
    allowedRoles: allBackofficeRoles
  },
  {
    label: "Operador",
    path: "/operador",
    icon: ClipboardCheck,
    allowedRoles: allBackofficeRoles
  },
  {
    label: "Empresas",
    path: "/empresas",
    icon: Building2,
    allowedRoles: managementRoles
  },
  {
    label: "Usuários",
    path: "/usuarios",
    icon: Users,
    allowedRoles: adminOnlyRoles
  },
  {
    label: "Relatórios",
    path: "/relatorios",
    icon: FileBarChart,
    allowedRoles: managementRoles
  }
];

function canAccess(userRole, allowedRoles = []) {
  if (!userRole) {
    return false;
  }

  return allowedRoles.includes(userRole);
}

export default function AppLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const visibleLinks = links.filter((item) =>
    canAccess(user?.role, item.allowedRoles)
  );

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 flex-col bg-navy text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-yellowBrand text-navy">
              <Bus size={26} strokeWidth={3} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight">VaiRápido</h1>
              <p className="text-xs font-semibold text-blue-100">Backoffice</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {visibleLinks.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition",
                    isActive
                      ? "bg-yellowBrand text-navy shadow-lg shadow-yellowBrand/20"
                      : "text-blue-50 hover:bg-white/10"
                  ].join(" ")
                }
              >
                <Icon size={20} strokeWidth={2.7} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-5">
          <div className="mb-4 rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-bold uppercase text-blue-100">Usuário</p>
            <p className="mt-1 truncate text-sm font-black">
              {user?.fullName || user?.email || "Usuário"}
            </p>
            <p className="mt-1 text-xs font-bold text-yellowBrand">
              {user?.role || "-"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Sistema VaiRápido
              </p>
              <h2 className="text-2xl font-black text-navy">
                Painéis operacionais
              </h2>
            </div>

            <button
              onClick={handleLogout}
              type="button"
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-navy lg:hidden"
            >
              Sair
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}