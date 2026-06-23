import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import { listTransportCompanies } from "../api/transportCompanies";

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
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
    "-"
  );
}

function getCompanyDocument(company) {
  return (
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
  return company.phone || company.whatsapp || company.contactPhone || "-";
}

function isCompanyActive(company) {
  if (typeof company.active === "boolean") {
    return company.active;
  }

  if (typeof company.enabled === "boolean") {
    return company.enabled;
  }

  if (company.status) {
    return String(company.status).toUpperCase() === "ACTIVE";
  }

  return true;
}

function statusPill(company) {
  const active = isCompanyActive(company);

  if (active) {
    return (
      <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
        Ativa
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
      Inativa
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

export default function CompaniesPanel() {
  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const metrics = useMemo(() => {
    const active = companies.filter((company) => isCompanyActive(company)).length;
    const inactive = companies.length - active;

    return {
      total: companies.length,
      active,
      inactive
    };
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return companies;
    }

    return companies.filter((company) => {
      return [
        getCompanyName(company),
        getCompanyTradeName(company),
        getCompanyDocument(company),
        getCompanyEmail(company),
        getCompanyPhone(company),
        company.status,
        company.id
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [query, companies]);

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
                Empresas de transporte
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Consulte empresas cadastradas, nomes comerciais, contatos e status operacional.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-xs font-black uppercase text-blue-100">
                Módulo
              </p>
              <p className="mt-1 text-3xl font-black text-yellowBrand">
                55
              </p>
              <p className="text-sm font-bold text-white">
                Empresas reais
              </p>
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
                A listagem de empresas exige perfil administrativo ou gestor autorizado.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-3">
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
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-7 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-navy">
              Empresas cadastradas
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Lista real carregada do backend VaiRápido.
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
                placeholder="Buscar empresa..."
              />
            </div>

            <button
              type="button"
              onClick={loadCompanies}
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
            Carregando empresas...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
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
                </tr>
              </thead>

              <tbody>
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id || getCompanyName(company)}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-7 py-5">
                      <div className="flex gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                          <Building2 size={23} strokeWidth={2.8} />
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
                      </div>
                    </td>

                    <td className="px-7 py-5">
                      {statusPill(company)}
                    </td>

                    <td className="px-7 py-5 text-sm font-bold text-slate-600">
                      {formatDateTime(company.createdAt)}
                    </td>
                  </tr>
                ))}

                {filteredCompanies.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
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
              Próxima etapa
            </h3>

            <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
              Depois da listagem, podemos ativar criação/edição de empresas, vínculo com gestores e filtro por empresa no painel operacional.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}