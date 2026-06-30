import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import { getOperationalIncidents } from "../api/incidents";

const sourceOptions = ["Reservas", "Pagamentos", "Bilhetes", "WhatsApp"];
const severityOptions = [
  { value: "critical", label: "Crítica" },
  { value: "warning", label: "Atenção" },
  { value: "info", label: "Informativa" }
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).replaceAll('"', '""');

  if (
    text.includes(";") ||
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text}"`;
  }

  return text;
}

function downloadCsv(filename, rows) {
  const csvContent = rows.map((row) => row.map(csvEscape).join(";")).join("\n");

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function severityPill(severity) {
  const styles = {
    critical: "bg-red-50 text-red-700 ring-red-200",
    warning: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40",
    info: "bg-blue-50 text-blue-700 ring-blue-200"
  };

  const labels = {
    critical: "Crítica",
    warning: "Atenção",
    info: "Info"
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
        styles[severity] || styles.info
      ].join(" ")}
    >
      {labels[severity] || "Info"}
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
    <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 break-words text-2xl font-black tracking-tight text-navy lg:text-3xl">
            {value}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}
        >
          <Icon size={23} strokeWidth={2.8} />
        </div>
      </div>
    </article>
  );
}

export default function IncidentsPanel() {
  const [incidents, setIncidents] = useState([]);
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const metrics = useMemo(() => {
    const critical = incidents.filter((item) => item.severity === "critical");
    const warning = incidents.filter((item) => item.severity === "warning");
    const info = incidents.filter((item) => item.severity === "info");

    return {
      total: incidents.length,
      critical: critical.length,
      warning: warning.length,
      info: info.length
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const term = normalizeText(query);

    return incidents.filter((incident) => {
      const matchesSource =
        sourceFilter === "ALL" || incident.source === sourceFilter;
      const matchesSeverity =
        severityFilter === "ALL" || incident.severity === severityFilter;

      const matchesQuery =
        !term ||
        [
          incident.source,
          incident.type,
          incident.severity,
          incident.status,
          incident.title,
          incident.description,
          incident.recommendation,
          incident.reference,
          incident.entityId,
          incident.passengerName,
          incident.passengerPhone,
          incident.companyName,
          incident.routeLabel,
          incident.country,
          incident.currency
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));

      return matchesSource && matchesSeverity && matchesQuery;
    });
  }, [incidents, query, severityFilter, sourceFilter]);

  async function loadIncidents() {
    setLoading(true);
    setMessage(null);

    try {
      const data = await getOperationalIncidents();

      setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
      setErrors(data.errors || {});

      const failedModules = Object.entries(data.errors || {})
        .filter(([, error]) => Boolean(error))
        .map(([key]) => key);

      if (failedModules.length > 0) {
        setMessage({
          type: "warning",
          text: `Alguns módulos não carregaram na central: ${failedModules.join(", ")}.`
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  function clearFilters() {
    setQuery("");
    setSourceFilter("ALL");
    setSeverityFilter("ALL");
  }

  function handleExportCsv() {
    const rows = [
      [
        "Fonte",
        "Severidade",
        "Status",
        "Referência",
        "Passageiro",
        "Telefone",
        "Empresa",
        "Rota",
        "País",
        "Moeda",
        "Criado em",
        "Prazo",
        "Título",
        "Descrição",
        "Recomendação"
      ],
      ...filteredIncidents.map((incident) => [
        incident.source,
        incident.severity,
        incident.status,
        incident.reference,
        incident.passengerName,
        incident.passengerPhone,
        incident.companyName,
        incident.routeLabel,
        incident.country,
        incident.currency,
        formatDateTime(incident.createdAt),
        formatDateTime(incident.dueAt),
        incident.title,
        incident.description,
        incident.recommendation
      ])
    ];

    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    downloadCsv(`vairapido-ocorrencias-${timestamp}.csv`, rows);
  }

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <Siren size={16} />
                Módulo 75
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Central de ocorrências operacionais
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Priorize problemas reais da operação: reservas vencidas,
                pagamentos falhos, bilhetes pendentes e mensagens WhatsApp com falha.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadIncidents}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white"
              >
                <RefreshCw size={18} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy"
              >
                <Download size={18} />
                CSV
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
            message.type === "warning" ? "bg-yellowBrand/20 text-amber-800" : ""
          ].join(" ")}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <section className="flex min-h-56 items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-10 text-sm font-black text-slate-500 shadow-soft">
          <Loader2 className="animate-spin" size={22} />
          Carregando ocorrências...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Ocorrências"
              value={metrics.total}
              description="Total identificado agora."
              icon={Siren}
              tone="navy"
            />

            <MetricCard
              title="Críticas"
              value={metrics.critical}
              description="Exigem ação imediata."
              icon={XCircle}
              tone="red"
            />

            <MetricCard
              title="Atenção"
              value={metrics.warning}
              description="Podem virar problema."
              icon={AlertTriangle}
              tone="yellow"
            />

            <MetricCard
              title="Informativas"
              value={metrics.info}
              description="Acompanhar operação."
              icon={CheckCircle2}
              tone="blue"
            />
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                  <Search size={15} />
                  Filtros
                </div>

                <h2 className="text-2xl font-black text-navy">
                  Controle das ocorrências
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Filtre por fonte, severidade, passageiro, empresa, rota ou referência.
                </p>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-navy"
              >
                Limpar filtros
              </button>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Buscar</span>

                <div className="relative min-w-0">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Reserva, pagamento, passageiro, telefone..."
                  />
                </div>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Fonte</span>

                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todas</option>
                  {sourceOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Severidade</span>

                <select
                  value={severityFilter}
                  onChange={(event) => setSeverityFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todas</option>
                  {severityOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="grid min-w-0 gap-5">
            {filteredIncidents.slice(0, 250).map((incident) => (
              <article
                key={incident.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      {severityPill(incident.severity)}
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                        {incident.source}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                        {incident.status}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-navy">{incident.title}</h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                      {incident.description}
                    </p>

                    <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-2">
                      <span>Referência: {incident.reference || "-"}</span>
                      <span>Passageiro: {incident.passengerName || "-"}</span>
                      <span>Telefone: {incident.passengerPhone || "-"}</span>
                      <span>Empresa: {incident.companyName || "-"}</span>
                      <span>País/Moeda: {incident.country || "-"} · {incident.currency || "-"}</span>
                      <span>Rota: {incident.routeLabel || "-"}</span>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-3xl bg-slate-50 p-5 xl:w-80">
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                      <Clock3 size={14} />
                      Datas
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-600">
                      Criado: {formatDateTime(incident.createdAt)}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-600">
                      Prazo: {formatDateTime(incident.dueAt)}
                    </p>

                    <p className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                      <ShieldAlert size={14} />
                      Recomendação
                    </p>

                    <p className="mt-2 text-sm font-bold leading-6 text-navy">
                      {incident.recommendation}
                    </p>
                  </div>
                </div>
              </article>
            ))}

            {filteredIncidents.length === 0 && (
              <section className="rounded-[2rem] border border-green-200 bg-green-50 p-8 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-green-100 text-green-700">
                  <ShieldCheck size={28} />
                </div>

                <h2 className="text-2xl font-black text-green-900">
                  Nenhuma ocorrência encontrada
                </h2>

                <p className="mt-2 text-sm font-semibold text-green-800">
                  A operação não possui alertas dentro do filtro atual.
                </p>
              </section>
            )}
          </section>

          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                <ShieldCheck size={24} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-black text-blue-900">
                  Módulo 75 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  A central identifica ocorrências a partir dos dados reais. Depois
                  poderemos evoluir para workflow com responsável, SLA e status de
                  tratamento.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
