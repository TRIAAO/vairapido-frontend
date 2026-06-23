import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  createAdminUser,
  deactivateAdminUser,
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus
} from "../api/adminUsers";

const roleOptions = [
  { value: "ADMIN", label: "ADMIN" },
  { value: "COMPANY_ADMIN", label: "COMPANY_ADMIN" },
  { value: "OPERATOR", label: "OPERATOR" }
];

const initialForm = {
  fullName: "",
  email: "",
  password: "123456",
  role: "OPERATOR",
  transportCompanyId: "",
  whatsapp: "",
  active: true
};

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function roleLabel(role) {
  const labels = {
    ADMIN: "Administrador",
    ROLE_ADMIN: "Administrador",
    COMPANY_ADMIN: "Gestor da empresa",
    ROLE_COMPANY_ADMIN: "Gestor da empresa",
    OPERATOR: "Operador/Fiscal",
    ROLE_OPERATOR: "Operador/Fiscal"
  };

  return labels[role] || role || "-";
}

function statusPill(active) {
  if (active) {
    return (
      <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
        Ativo
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
      Inativo
    </span>
  );
}

function whatsappPill(user) {
  if (!user.whatsapp) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
        Não informado
      </span>
    );
  }

  if (user.whatsappVerified) {
    return (
      <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
        Verificado
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-yellowBrand/20 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-yellowBrand/40">
      Pendente
    </span>
  );
}

function MetricCard({ title, value, description, icon: Icon, tone = "navy" }) {
  const tones = {
    navy: "bg-navy/10 text-navy",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellowBrand/20 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700"
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <h3 className="mt-3 text-4xl font-black tracking-tight text-navy">
            {value}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div className={`grid h-13 w-13 place-items-center rounded-2xl ${tones[tone]}`}>
          <Icon size={26} strokeWidth={2.8} />
        </div>
      </div>
    </article>
  );
}

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const metrics = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.active).length,
      admins: users.filter((user) => String(user.role || "").includes("ADMIN")).length,
      operators: users.filter((user) => String(user.role || "").includes("OPERATOR")).length
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) => {
      return [
        user.fullName,
        user.email,
        user.role,
        user.transportCompanyName,
        user.transportCompanyTradeName,
        user.whatsapp
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [query, users]);

  async function loadUsers() {
    setLoading(true);
    setMessage(null);
    setAccessDenied(false);

    try {
      const data = await listAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      const status = error?.response?.status;

      if (status === 403) {
        setAccessDenied(true);
      }

      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateFormField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();

    setCreating(true);
    setMessage(null);

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      transportCompanyId: form.transportCompanyId.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      active: form.active
    };

    try {
      await createAdminUser(payload);
      setMessage({
        type: "success",
        text: "Usuário criado com sucesso."
      });
      setForm(initialForm);
      setShowCreate(false);
      await loadUsers();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(user, role) {
    setChangingId(user.id);
    setMessage(null);

    try {
      await updateAdminUserRole(user.id, role);
      setMessage({
        type: "success",
        text: "Perfil atualizado com sucesso."
      });
      await loadUsers();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleStatusChange(user) {
    const nextStatus = !user.active;
    const confirmed = window.confirm(
      `${nextStatus ? "Ativar" : "Desativar"} o usuário ${user.fullName}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(user.id);
    setMessage(null);

    try {
      await updateAdminUserStatus(user.id, nextStatus);
      setMessage({
        type: "success",
        text: nextStatus ? "Usuário ativado com sucesso." : "Usuário desativado com sucesso."
      });
      await loadUsers();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleDeactivate(user) {
    const confirmed = window.confirm(
      `Deseja desativar ${user.fullName}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(user.id);
    setMessage(null);

    try {
      await deactivateAdminUser(user.id);
      setMessage({
        type: "success",
        text: "Usuário desativado com sucesso."
      });
      await loadUsers();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  return (
    <div className="grid gap-7">
      <section className="overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-7 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <Users size={16} />
                Usuários e permissões
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
                Gestão real de usuários
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Crie usuários, altere perfis, ative ou desative acessos e acompanhe vínculos operacionais.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreate((current) => !current)}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-6 font-black text-navy"
            >
              <Plus size={20} />
              Novo usuário
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div
          className={[
            "rounded-2xl px-5 py-4 text-sm font-black",
            message.type === "error" ? "bg-red-50 text-red-700" : "",
            message.type === "success" ? "bg-green-50 text-green-700" : ""
          ].join(" ")}
        >
          {message.text}
        </div>
      )}

      {accessDenied && (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-7">
          <div className="flex gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle size={28} strokeWidth={2.8} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-amber-900">
                Acesso restrito ao administrador
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-amber-800">
                A tela de usuários usa endpoints administrativos. Entre com uma conta ADMIN para listar, criar e alterar usuários.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total" value={metrics.total} description="Usuários cadastrados." icon={Users} tone="navy" />
        <MetricCard title="Ativos" value={metrics.active} description="Acessos liberados." icon={CheckCircle2} tone="green" />
        <MetricCard title="Admins" value={metrics.admins} description="Acesso administrativo." icon={ShieldCheck} tone="blue" />
        <MetricCard title="Operadores" value={metrics.operators} description="Fiscal e operação." icon={UserCog} tone="yellow" />
      </section>

      {showCreate && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-navy">Criar usuário</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Preencha os dados para criar um novo acesso ao backoffice.
            </p>
          </div>

          <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black text-navy">Nome completo</span>
              <input
                name="fullName"
                value={form.fullName}
                onChange={updateFormField}
                className="vr-input"
                placeholder="Ex: Fiscal VaiRápido"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black text-navy">E-mail</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateFormField}
                className="vr-input"
                placeholder="usuario@vairapido.com.br"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black text-navy">Senha inicial</span>
              <input
                name="password"
                type="text"
                value={form.password}
                onChange={updateFormField}
                className="vr-input"
                required
                minLength={6}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black text-navy">Perfil</span>
              <select
                name="role"
                value={form.role}
                onChange={updateFormField}
                className="vr-input"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black text-navy">ID da empresa vinculada</span>
              <input
                name="transportCompanyId"
                value={form.transportCompanyId}
                onChange={updateFormField}
                className="vr-input"
                placeholder="Opcional para COMPANY_ADMIN/OPERATOR"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black text-navy">WhatsApp</span>
              <input
                name="whatsapp"
                value={form.whatsapp}
                onChange={updateFormField}
                className="vr-input"
                placeholder="+5511999999999"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <input
                name="active"
                type="checkbox"
                checked={form.active}
                onChange={updateFormField}
                className="h-5 w-5"
              />
              <span className="text-sm font-black text-navy">Criar usuário ativo</span>
            </label>

            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-6 font-black text-white"
              >
                {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                {creating ? "Criando..." : "Criar usuário"}
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="min-h-12 rounded-2xl bg-slate-100 px-6 font-black text-navy"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-7 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-navy">Usuários cadastrados</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Lista real vinda do backend administrativo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={19}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10 sm:w-80"
                placeholder="Buscar usuário..."
              />
            </div>

            <button
              type="button"
              onClick={loadUsers}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 font-black text-navy"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm font-black text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            Carregando usuários...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Usuário</th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Perfil</th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">WhatsApp</th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Empresa</th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Criado em</th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-7 py-5">
                      <p className="text-sm font-black text-navy">{user.fullName}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{user.email}</p>
                    </td>

                    <td className="px-7 py-5">
                      <select
                        value={user.role || ""}
                        onChange={(event) => handleRoleChange(user, event.target.value)}
                        disabled={changingId === user.id}
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-navy outline-none"
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {roleLabel(user.role)}
                      </p>
                    </td>

                    <td className="px-7 py-5">
                      {statusPill(user.active)}
                    </td>

                    <td className="px-7 py-5">
                      <p className="text-sm font-bold text-slate-700">{user.whatsapp || "-"}</p>
                      <div className="mt-2">{whatsappPill(user)}</div>
                    </td>

                    <td className="px-7 py-5">
                      <div className="flex gap-2">
                        <Building2 size={17} className="mt-0.5 text-slate-400" />
                        <div>
                          <p className="text-sm font-black text-slate-700">
                            {user.transportCompanyTradeName || user.transportCompanyName || "-"}
                          </p>
                          {user.transportCompanyId && (
                            <p className="mt-1 max-w-[220px] truncate text-xs font-bold text-slate-400">
                              {user.transportCompanyId}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-7 py-5 text-sm font-bold text-slate-600">
                      {formatDateTime(user.createdAt)}
                    </td>

                    <td className="px-7 py-5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(user)}
                          disabled={changingId === user.id}
                          className={[
                            "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black",
                            user.active
                              ? "bg-yellowBrand/20 text-amber-800"
                              : "bg-green-50 text-green-700"
                          ].join(" ")}
                        >
                          {user.active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                          {user.active ? "Desativar" : "Ativar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeactivate(user)}
                          disabled={changingId === user.id || !user.active}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-50 px-4 text-xs font-black text-red-700 disabled:opacity-40"
                        >
                          Remover acesso
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-7 py-10 text-center text-sm font-black text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}