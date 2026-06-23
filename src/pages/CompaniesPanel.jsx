import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Edit3,
  Image,
  Loader2,
  Mail,
  Phone,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  activateTransportCompany,
  createTransportCompany,
  deactivateTransportCompany,
  deleteTransportCompany,
  listTransportCompanies,
  updateTransportCompany
} from "../api/transportCompanies";

const initialForm = {
  name: "",
  tradeName: "",
  documentNumber: "",
  email: "",
  phone: "",
  whatsapp: "",
  logoUrl: ""
};

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function normalizeStatus(value) {
  return String(value || "").toUpperCase();
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

function getCompanyName(company) {
  return (
    company.name ||
    company.companyName ||
    company.legalName ||
    company.fullName ||
    "-"
  );
}

function getCompanyTradeName(company) {
  return (
    company.tradeName ||
    company.companyTradeName ||
    company.displayName ||
    company.shortName ||
    getCompanyName(company)
  );
}

function getCompanyDocument(company) {
  return (
    company.documentNumber ||
    company.document ||
    company.cnpj ||
    company.nif ||
    company.taxId ||
    company.registrationNumber ||
    "-"
  );
}

function getCompanyEmail(company) {
  return company.email || company.contactEmail || "-";
}

function getCompanyPhone(company) {
  return company.phone || company.contactPhone || "-";
}

function getCompanyWhatsapp(company) {
  return company.whatsapp || company.contactWhatsapp || "-";
}

function getCompanyLogo(company) {
  return company.logoUrl || company.logo || "";
}

function isCompanyActive(company) {
  if (typeof company.active === "boolean") {
    return company.active;
  }

  if (typeof company.enabled === "boolean") {
    return company.enabled;
  }

  if (company.status) {
    return normalizeStatus(company.status) === "ACTIVE";
  }

  return true;
}

function statusPill(company) {
  const active = isCompanyActive(company);
  const status = normalizeStatus(company.status);

  if (active) {
    return (
      <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
        {status || "ATIVA"}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
      {status || "INATIVA"}
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

function buildCompanyPayload(form) {
  return {
    name: form.name.trim(),
    tradeName: form.tradeName.trim() || null,
    documentNumber: form.documentNumber.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    whatsapp: form.whatsapp.trim() || null,
    logoUrl: form.logoUrl.trim() || null
  };
}

function mapCompanyToForm(company) {
  return {
    name: getCompanyName(company) === "-" ? "" : getCompanyName(company),
    tradeName:
      getCompanyTradeName(company) === "-" ? "" : getCompanyTradeName(company),
    documentNumber:
      getCompanyDocument(company) === "-" ? "" : getCompanyDocument(company),
    email: getCompanyEmail(company) === "-" ? "" : getCompanyEmail(company),
    phone: getCompanyPhone(company) === "-" ? "" : getCompanyPhone(company),
    whatsapp:
      getCompanyWhatsapp(company) === "-" ? "" : getCompanyWhatsapp(company),
    logoUrl: getCompanyLogo(company)
  };
}

export default function CompaniesPanel() {
  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const metrics = useMemo(() => {
    const active = companies.filter((company) => isCompanyActive(company));
    const inactive = companies.filter((company) => !isCompanyActive(company));
    const withWhatsapp = companies.filter(
      (company) => getCompanyWhatsapp(company) !== "-"
    );

    return {
      total: companies.length,
      active: active.length,
      inactive: inactive.length,
      withWhatsapp: withWhatsapp.length
    };
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const term = query.trim().toLowerCase();

    return companies.filter((company) => {
      const active = isCompanyActive(company);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && active) ||
        (statusFilter === "INACTIVE" && !active);

      const matchesQuery =
        !term ||
        [
          getCompanyName(company),
          getCompanyTradeName(company),
          getCompanyDocument(company),
          getCompanyEmail(company),
          getCompanyPhone(company),
          getCompanyWhatsapp(company),
          company.status,
          company.id
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, companies]);

  async function loadCompanies() {
    setLoading(true);
    setMessage(null);
    setAccessDenied(false);

    try {
      const data = await listTransportCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error?.response?.status === 403) {
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
    loadCompanies();
  }, []);

  function updateFormField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function openCreateForm() {
    setEditingCompanyId(null);
    setForm(initialForm);
    setShowForm(true);
    setMessage(null);
  }

  function openEditForm(company) {
    setEditingCompanyId(company.id);
    setForm(mapCompanyToForm(company));
    setShowForm(true);
    setMessage(null);
  }

  function closeForm() {
    setEditingCompanyId(null);
    setForm(initialForm);
    setShowForm(false);
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);

    const payload = buildCompanyPayload(form);

    try {
      if (editingCompanyId) {
        await updateTransportCompany(editingCompanyId, payload);

        setMessage({
          type: "success",
          text: "Empresa atualizada com sucesso."
        });
      } else {
        await createTransportCompany(payload);

        setMessage({
          type: "success",
          text: "Empresa criada com sucesso."
        });
      }

      closeForm();
      await loadCompanies();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(company) {
    const active = isCompanyActive(company);
    const action = active ? "desativar" : "ativar";

    const confirmed = window.confirm(
      `Deseja ${action} a empresa ${getCompanyTradeName(company)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(company.id);
    setMessage(null);

    try {
      if (active) {
        await deactivateTransportCompany(company.id);
      } else {
        await activateTransportCompany(company.id);
      }

      setMessage({
        type: "success",
        text: active
          ? "Empresa desativada com sucesso."
          : "Empresa ativada com sucesso."
      });

      await loadCompanies();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleDelete(company) {
    const confirmed = window.confirm(
      `Deseja excluir definitivamente a empresa ${getCompanyTradeName(company)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(company.id);
    setMessage(null);

    try {
      await deleteTransportCompany(company.id);

      setMessage({
        type: "success",
        text: "Empresa excluída com sucesso."
      });

      await loadCompanies();
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
                <Building2 size={16} />
                Empresas
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
                Gestão real de empresas
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Cadastre, edite, ative, desative e acompanhe empresas de
                transporte vinculadas à operação VaiRápido.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadCompanies}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 font-black text-white"
              >
                <RefreshCw size={20} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-6 font-black text-navy"
              >
                <Plus size={20} />
                Nova empresa
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
                Acesso restrito
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-amber-800">
                A gestão de empresas exige perfil administrativo ou gestor
                autorizado.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Empresas"
          value={metrics.total}
          description="Total cadastrado."
          icon={Building2}
          tone="navy"
        />

        <MetricCard
          title="Ativas"
          value={metrics.active}
          description="Liberadas para operação."
          icon={CheckCircle2}
          tone="green"
        />

        <MetricCard
          title="Inativas"
          value={metrics.inactive}
          description="Bloqueadas ou suspensas."
          icon={XCircle}
          tone="red"
        />

        <MetricCard
          title="Com WhatsApp"
          value={metrics.withWhatsapp}
          description="Contato operacional informado."
          icon={Phone}
          tone="yellow"
        />
      </section>

      {showForm && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-navy">
                {editingCompanyId ? "Editar empresa" : "Nova empresa"}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Preencha os dados principais da transportadora.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 font-black text-navy"
            >
              <X size={18} />
              Fechar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2">
                <FieldLabel>Nome jurídico</FieldLabel>
                <input
                  name="name"
                  value={form.name}
                  onChange={updateFormField}
                  required
                  maxLength={160}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="Ex: Atlântico Bus Transportes LTDA"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>Nome comercial</FieldLabel>
                <input
                  name="tradeName"
                  value={form.tradeName}
                  onChange={updateFormField}
                  maxLength={160}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="Ex: Atlântico Bus"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>Documento</FieldLabel>
                <input
                  name="documentNumber"
                  value={form.documentNumber}
                  onChange={updateFormField}
                  required
                  maxLength={30}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="CNPJ, NIF ou documento fiscal"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>E-mail</FieldLabel>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateFormField}
                  maxLength={160}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="contato@empresa.com"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>Telefone</FieldLabel>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={updateFormField}
                  maxLength={40}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="+55..."
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>WhatsApp</FieldLabel>
                <input
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={updateFormField}
                  maxLength={40}
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="+244..."
                />
              </label>
            </div>

            <label className="grid gap-2">
              <FieldLabel>Logo URL</FieldLabel>
              <input
                name="logoUrl"
                value={form.logoUrl}
                onChange={updateFormField}
                className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                placeholder="https://..."
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 font-black text-navy"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {editingCompanyId ? "Salvar alterações" : "Criar empresa"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-navy">
              Filtros de empresas
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Busque por nome, documento, e-mail, telefone, WhatsApp ou ID.
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

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2">
            <FieldLabel>Buscar</FieldLabel>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={19}
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                placeholder="Buscar empresa..."
              />
            </div>
          </label>

          <label className="grid gap-2">
            <FieldLabel>Status</FieldLabel>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="INACTIVE">Inativas</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-600">
          Resultado filtrado: {filteredCompanies.length} empresas
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-7 py-6">
          <h2 className="text-2xl font-black text-navy">
            Empresas cadastradas
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Lista real carregada do backend VaiRápido.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm font-black text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            Carregando empresas...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Empresa
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Documento
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Contato
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
                {filteredCompanies.map((company) => {
                  const busy = changingId === company.id;
                  const active = isCompanyActive(company);

                  return (
                    <tr
                      key={company.id || getCompanyName(company)}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-7 py-5">
                        <div className="flex gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                            {getCompanyLogo(company) ? (
                              <Image size={23} strokeWidth={2.8} />
                            ) : (
                              <Building2 size={23} strokeWidth={2.8} />
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-black text-navy">
                              {getCompanyTradeName(company)}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {getCompanyName(company)}
                            </p>

                            {company.id && (
                              <p className="mt-1 max-w-[260px] truncate text-xs font-bold text-slate-400">
                                {company.id}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-700">
                        {valueOrDash(getCompanyDocument(company))}
                      </td>

                      <td className="px-7 py-5">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Mail size={16} className="text-slate-400" />
                            {valueOrDash(getCompanyEmail(company))}
                          </div>

                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Phone size={16} className="text-slate-400" />
                            {valueOrDash(getCompanyPhone(company))}
                          </div>

                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Phone size={16} className="text-slate-400" />
                            WhatsApp: {valueOrDash(getCompanyWhatsapp(company))}
                          </div>
                        </div>
                      </td>

                      <td className="px-7 py-5">{statusPill(company)}</td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-600">
                        {formatDateTime(company.createdAt)}
                      </td>

                      <td className="px-7 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openEditForm(company)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-navy disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Edit3 size={16} />
                            Editar
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleStatus(company)}
                            className={[
                              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-60",
                              active
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                            ].join(" ")}
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : active ? (
                              <PowerOff size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                            {active ? "Desativar" : "Ativar"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(company)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-100 px-3 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCompanies.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-7 py-10 text-center text-sm font-black text-slate-500"
                    >
                      Nenhuma empresa encontrada.
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
              Esta tela manipula empresas reais do backend. Antes de excluir,
              confirme se a empresa não possui rotas, viagens ou usuários
              vinculados.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}