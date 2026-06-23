import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCog,
  Users,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  clearAdminUserWhatsapp,
  createAdminUser,
  deactivateAdminUser,
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateAdminUserWhatsapp,
  verifyAdminUserWhatsapp
} from "../api/adminUsers";
import { listTransportCompanies } from "../api/transportCompanies";

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
  whatsappVerified: false,
  active: true
};

function normalizeRole(role) {
  return String(role || "").replace("ROLE_", "").toUpperCase();
}

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
  const normalized = normalizeRole(role);

  const labels = {
    ADMIN: "Administrador",
    COMPANY_ADMIN: "Gestor da empresa",
    OPERATOR: "Operador/Fiscal"
  };

  return labels[normalized] || normalized || "-";
}

function rolePill(role) {
  const normalized = normalizeRole(role);

  const styles = {
    ADMIN: "bg-blue-50 text-blue-700 ring-blue-200",
    COMPANY_ADMIN: "bg-purple-50 text-purple-700 ring-purple-200",
    OPERATOR: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40"
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
        styles[normalized] || "bg-slate-100 text-slate-700 ring-slate-200"
      ].join(" ")}
    >
      {normalized || "-"}
    </span>
  );
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

function getCompanyDisplayName(company) {
  return (
    company.tradeName ||
    company.companyTradeName ||
    company.displayName ||
    company.name ||
    company.companyName ||
    company.legalName ||
    company.id ||
    "-"
  );
}

function getUserCompanyName(user) {
  return (
    user.transportCompanyTradeName ||
    user.transportCompanyName ||
    user.companyTradeName ||
    user.companyName ||
    "-"
  );
}

function MetricCard({ title, value, description, icon: Icon, tone = "navy" }) {
  const tones = {
    navy: "bg-navy/10 text-navy",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellowBrand/20 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700"
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

        <div
          className={`grid h-14 w-14 place-items-center rounded-2xl ${tones[tone]}`}
        >
          <Icon size={26} strokeWidth={2.8} />
        </div>
      </div>
    </article>
  );
}

function FieldLabel({ children }) {
  return <span className="text-sm font-black text-navy">{children}</span>;
}

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const metrics = useMemo(() => {
    const admins = users.filter((user) => normalizeRole(user.role) === "ADMIN");
    const managers = users.filter(
      (user) => normalizeRole(user.role) === "COMPANY_ADMIN"
    );
    const operators = users.filter(
      (user) => normalizeRole(user.role) === "OPERATOR"
    );
    const active = users.filter((user) => Boolean(user.active));
    const inactive = users.filter((user) => !user.active);

    return {
      total: users.length,
      active: active.length,
      inactive: inactive.length,
      admins: admins.length,
      managers: managers.length,
      operators: operators.length
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();

    return users.filter((user) => {
      const role = normalizeRole(user.role);
      const active = Boolean(user.active);

      const matchesRole = roleFilter === "ALL" || role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && active) ||
        (statusFilter === "INACTIVE" && !active);

      const matchesQuery =
        !term ||
        [
          user.fullName,
          user.email,
          user.role,
          user.whatsapp,
          user.transportCompanyId,
          user.transportCompanyName,
          user.transportCompanyTradeName
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesRole && matchesStatus && matchesQuery;
    });
  }, [query, roleFilter, statusFilter, users]);

  async function loadData() {
    setLoading(true);
    setMessage(null);
    setAccessDenied(false);

    try {
      const [usersResult, companiesResult] = await Promise.allSettled([
        listAdminUsers(),
        listTransportCompanies()
      ]);

      if (usersResult.status === "fulfilled") {
        setUsers(Array.isArray(usersResult.value) ? usersResult.value : []);
      } else {
        const status = usersResult.reason?.response?.status;

        if (status === 403) {
          setAccessDenied(true);
        }

        setMessage({
          type: "error",
          text: extractApiError(usersResult.reason)
        });
      }

      if (companiesResult.status === "fulfilled") {
        setCompanies(
          Array.isArray(companiesResult.value) ? companiesResult.value : []
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateFormField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function clearFilters() {
    setQuery("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
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
      whatsappVerified: Boolean(form.whatsappVerified),
      active: Boolean(form.active)
    };

    try {
      await createAdminUser(payload);

      setMessage({
        type: "success",
        text: "Usuário criado com sucesso."
      });

      setForm(initialForm);
      setShowCreate(false);

      await loadData();
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
    if (normalizeRole(user.role) === role) {
      return;
    }

    const confirmed = window.confirm(
      `Alterar perfil de ${user.fullName} para ${roleLabel(role)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(user.id);
    setMessage(null);

    try {
      await updateAdminUserRole(user.id, role);

      setMessage({
        type: "success",
        text: "Perfil atualizado com sucesso."
      });

      await loadData();
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
        text: nextStatus
          ? "Usuário ativado com sucesso."
          : "Usuário desativado com sucesso."
      });

      await loadData();
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
      `Deseja desativar ${user.fullName}? Esta ação remove o acesso do usuário.`
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

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleWhatsappUpdate(user) {
    const whatsapp = window.prompt(
      `Informe o WhatsApp de ${user.fullName}:`,
      user.whatsapp || ""
    );

    if (whatsapp === null) {
      return;
    }

    const trimmed = whatsapp.trim();

    if (!trimmed) {
      alert("Informe um número de WhatsApp válido.");
      return;
    }

    const whatsappVerified = window.confirm(
      "Deseja salvar este WhatsApp como verificado?"
    );

    setChangingId(user.id);
    setMessage(null);

    try {
      await updateAdminUserWhatsapp(user.id, trimmed, whatsappVerified);

      setMessage({
        type: "success",
        text: "WhatsApp atualizado com sucesso."
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleWhatsappVerify(user) {
    const confirmed = window.confirm(
      `Confirmar WhatsApp de ${user.fullName} como verificado?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(user.id);
    setMessage(null);

    try {
      await verifyAdminUserWhatsapp(user.id);

      setMessage({
        type: "success",
        text: "WhatsApp verificado com sucesso."
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleWhatsappClear(user) {
    const confirmed = window.confirm(
      `Remover WhatsApp de ${user.fullName}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(user.id);
    setMessage(null);

    try {
      await clearAdminUserWhatsapp(user.id);

      setMessage({
        type: "success",
        text: "WhatsApp removido com sucesso."
      });

      await loadData();
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
                Crie usuários, altere perfis, ative/desative acessos, gerencie
                WhatsApp e acompanhe vínculos operacionais.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 font-black text-white"
              >
                <RefreshCw size={20} />
                Atualizar
              </button>

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
                A tela de usuários usa endpoints administrativos. Entre com uma
                conta ADMIN para listar, criar e alterar usuários.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total"
          value={metrics.total}
          description="Usuários cadastrados."
          icon={Users}
          tone="navy"
        />

        <MetricCard
          title="Ativos"
          value={metrics.active}
          description={`${metrics.inactive} inativos.`}
          icon={CheckCircle2}
          tone="green"
        />

        <MetricCard
          title="Admins"
          value={metrics.admins}
          description={`${metrics.managers} gestores de empresa.`}
          icon={ShieldCheck}
          tone="blue"
        />

        <MetricCard
          title="Operadores"
          value={metrics.operators}
          description="Fiscal e operação."
          icon={UserCog}
          tone="yellow"
        />
      </section>

      {showCreate && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-navy">
              Novo usuário
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Crie usuários administrativos, gestores de empresa ou operadores.
            </p>
          </div>

          <form onSubmit={handleCreate} className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2">
                <FieldLabel>Nome completo</FieldLabel>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={updateFormField}
                  required
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="Ex: Fiscal VaiRápido"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>E-mail</FieldLabel>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateFormField}
                  required
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="usuario@vairapido.com.br"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>Senha inicial</FieldLabel>
                <input
                  type="text"
                  name="password"
                  value={form.password}
                  onChange={updateFormField}
                  required
                  minLength={6}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>Perfil</FieldLabel>
                <select
                  name="role"
                  value={form.role}
                  onChange={updateFormField}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <FieldLabel>Empresa vinculada</FieldLabel>
                <select
                  name="transportCompanyId"
                  value={form.transportCompanyId}
                  onChange={updateFormField}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="">Sem vínculo</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {getCompanyDisplayName(company)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <FieldLabel>WhatsApp</FieldLabel>
                <input
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={updateFormField}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="+244..."
                />
              </label>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-3 text-sm font-black text-navy">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={updateFormField}
                  className="h-5 w-5 rounded border-slate-300"
                />
                Criar usuário ativo
              </label>

              <label className="inline-flex items-center gap-3 text-sm font-black text-navy">
                <input
                  type="checkbox"
                  name="whatsappVerified"
                  checked={form.whatsappVerified}
                  onChange={updateFormField}
                  className="h-5 w-5 rounded border-slate-300"
                />
                WhatsApp verificado
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 font-black text-navy"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={creating}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                Criar usuário
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-navy">
              Filtros de usuários
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Busque por nome, e-mail, perfil, empresa ou WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 font-black text-navy"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="grid gap-2">
            <FieldLabel>Buscar</FieldLabel>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                placeholder="Nome, e-mail, empresa..."
              />
            </div>
          </label>

          <label className="grid gap-2">
            <FieldLabel>Perfil</FieldLabel>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
            >
              <option value="ALL">Todos os perfis</option>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <FieldLabel>Status</FieldLabel>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-600">
          Resultado filtrado: {filteredUsers.length} usuários
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-7 py-6">
          <h2 className="text-2xl font-black text-navy">
            Usuários cadastrados
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Lista real carregada do backend administrativo.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm font-black text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            Carregando usuários...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Usuário
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Perfil
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Empresa
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    WhatsApp
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Criado em
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => {
                  const busy = changingId === user.id;
                  const role = normalizeRole(user.role);

                  return (
                    <tr
                      key={user.id || user.email}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-7 py-5">
                        <div className="flex gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                            <Users size={23} strokeWidth={2.8} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-black text-navy">
                              {user.fullName || "-"}
                            </p>

                            <p className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                              <Mail size={14} />
                              {user.email || "-"}
                            </p>

                            {user.id && (
                              <p className="mt-1 max-w-[260px] truncate text-xs font-bold text-slate-400">
                                {user.id}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-7 py-5">
                        <div className="grid gap-3">
                          {rolePill(role)}

                          <select
                            value={role}
                            disabled={busy}
                            onChange={(event) =>
                              handleRoleChange(user, event.target.value)
                            }
                            className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-black text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td className="px-7 py-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Building2 size={17} className="text-slate-400" />
                          <span>{getUserCompanyName(user)}</span>
                        </div>

                        {user.transportCompanyId && (
                          <p className="mt-1 max-w-[240px] truncate text-xs font-bold text-slate-400">
                            {user.transportCompanyId}
                          </p>
                        )}
                      </td>

                      <td className="px-7 py-5">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Phone size={17} className="text-slate-400" />
                            {user.whatsapp || "-"}
                          </div>

                          {whatsappPill(user)}
                        </div>
                      </td>

                      <td className="px-7 py-5">
                        {statusPill(Boolean(user.active))}
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-600">
                        {formatDateTime(user.createdAt)}
                      </td>

                      <td className="px-7 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleStatusChange(user)}
                            className={[
                              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-60",
                              user.active
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                            ].join(" ")}
                          >
                            {user.active ? (
                              <XCircle size={16} />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            {user.active ? "Desativar" : "Ativar"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleWhatsappUpdate(user)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-navy disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Smartphone size={16} />
                            WhatsApp
                          </button>

                          {user.whatsapp && !user.whatsappVerified && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleWhatsappVerify(user)}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-green-50 px-3 text-xs font-black text-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <CheckCircle2 size={16} />
                              Verificar
                            </button>
                          )}

                          {user.whatsapp && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleWhatsappClear(user)}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 text-xs font-black text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={16} />
                              Remover WPP
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDeactivate(user)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-100 px-3 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            Bloquear
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-7 py-10 text-center text-sm font-black text-slate-500"
                    >
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-700">
            <ShieldCheck size={25} strokeWidth={2.8} />
          </div>

          <div>
            <h3 className="text-lg font-black text-blue-900">
              Segurança administrativa
            </h3>

            <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
              Esta tela usa endpoints restritos ao perfil ADMIN. Alterações de
              perfil, status e WhatsApp devem ser feitas apenas por usuários
              autorizados.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}