import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import { getAuditOverview } from "../api/audit";

const moduleOptions = [
  "Reservas",
  "Pagamentos",
  "Bilhetes",
  "Passageiros",
  "WhatsApp"
];

const levelOptions = [
  { value: "info", label: "Informação" },
  { value: "success", label: "Sucesso" },
  { value: "warning", label: "Atenção" },
  { value: "danger", label: "Crítico" }
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

function getDateOnly(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
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

function levelPill(level) {
  const styles = {
    info: "bg-blue-50 text-blue-700 ring-blue-200",
    success: "bg-green-50 text-green-700 ring-green-200",
    warning: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40",
    danger: "bg-red-50 text-red-700 ring-red-200"
  };

  const labels = {
    info: "Info",
    success: "Sucesso",
    warning: "Atenção",
    danger: "Crítico"
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
        styles[level] || styles.info
      ].join(" ")}
    >
      {labels[level] || "Info"}
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

export default function AuditPanel() {
  const [events, setEvents] = useState([]);
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const metrics = useMemo(() => {
    const success = events.filter((event) => event.level === "success");
    const warning = events.filter((event) => event.level === "warning");
    const danger = events.filter((event) => event.level === "danger");
    const today = new Date().toISOString().slice(0, 10);
    const todayEvents = events.filter((event) => getDateOnly(event.date) === today);

    return {
      total: events.length,
      success: success.length,
      warning: warning.length,
      danger: danger.length,
      today: todayEvents.length
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const term = normalizeText(query);

    return events.filter((event) => {
      const eventDate = getDateOnly(event.date);

      const matchesModule =
        moduleFilter === "ALL" || event.module === moduleFilter;
      const matchesLevel = levelFilter === "ALL" || event.level === levelFilter;
      const matchesStart = !startDate || eventDate >= startDate;
      const matchesEnd = !endDate || eventDate <= endDate;

      const matchesQuery =
        !term ||
        [
          event.module,
          event.action,
          event.status,
          event.actor,
          event.reference,
          event.entityId,
          event.passengerName,
          event.companyName,
          event.routeLabel,
          event.description,
          event.details
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));

      return (
        matchesModule &&
        matchesLevel &&
        matchesStart &&
        matchesEnd &&
        matchesQuery
      );
    });
  }, [endDate, events, levelFilter, moduleFilter, query, startDate]);

  async function loadAudit() {
    setLoading(true);
    setMessage(null);

    try {
      const data = await getAuditOverview();

      setEvents(Array.isArray(data.events) ? data.events : []);
      setErrors(data.errors || {});

      const failedModules = Object.entries(data.errors || {})
        .filter(([, error]) => Boolean(error))
        .map(([key]) => key);

      if (failedModules.length > 0) {
        setMessage({
          type: "warning",
          text: `Alguns módulos não carregaram na auditoria: ${failedModules.join(", ")}.`
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
    loadAudit();
  }, []);

  function clearFilters() {
    setQuery("");
    setModuleFilter("ALL");
    setLevelFilter("ALL");
    setStartDate("");
    setEndDate("");
  }

  function handleExportCsv() {
    const rows = [
      [
        "Data",
        "Módulo",
        "Ação",
        "Nível",
        "Status",
        "Ator",
        "Referência",
        "Passageiro",
        "Empresa",
        "Rota",
        "Descrição",
        "Detalhes"
      ],
      ...filteredEvents.map((event) => [
        formatDateTime(event.date),
        event.module,
        event.action,
        event.level,
        event.status,
        event.actor,
        event.reference,
        event.passengerName,
        event.companyName,
        event.routeLabel,
        event.description,
        event.details
      ])
    ];

    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    downloadCsv(`vairapido-auditoria-${timestamp}.csv`, rows);
  }

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <History size={16} />
                Módulo 74
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Auditoria e histórico operacional
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Linha do tempo consolidada com ações de reservas, pagamentos,
                bilhetes, passageiros e WhatsApp.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadAudit}
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
          Carregando auditoria...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Eventos"
              value={metrics.total}
              description={`${metrics.today} evento(s) hoje.`}
              icon={History}
              tone="navy"
            />

            <MetricCard
              title="Sucesso"
              value={metrics.success}
              description="Ações concluídas."
              icon={CheckCircle2}
              tone="green"
            />

            <MetricCard
              title="Atenção"
              value={metrics.warning}
              description="Expirações e alertas."
              icon={AlertTriangle}
              tone="yellow"
            />

            <MetricCard
              title="Críticos"
              value={metrics.danger}
              description="Cancelamentos e falhas."
              icon={XCircle}
              tone="red"
            />
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                  <Search size={15} />
                  Filtros
                </div>

                <h2 className="text-2xl font-black text-navy">Controle da auditoria</h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Busque por módulo, referência, passageiro, empresa, status ou ação.
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

            <div className="grid min-w-0 gap-4 lg:grid-cols-4">
              <label className="grid min-w-0 gap-2 lg:col-span-2">
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
                    placeholder="Reserva, bilhete, passageiro, ação..."
                  />
                </div>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Módulo</span>

                <select
                  value={moduleFilter}
                  onChange={(event) => setModuleFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todos</option>
                  {moduleOptions.map((moduleName) => (
                    <option key={moduleName} value={moduleName}>
                      {moduleName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Nível</span>

                <select
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todos</option>
                  {levelOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Data inicial</span>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                />
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Data final</span>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                />
              </label>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-black text-navy">Linha do tempo</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {filteredEvents.length} evento(s) no filtro atual.
              </p>
            </div>

            <div className="grid gap-0">
              {filteredEvents.slice(0, 250).map((event) => (
                <article
                  key={event.id}
                  className="grid gap-4 border-b border-slate-100 px-6 py-5 last:border-0 xl:grid-cols-[210px_1fr_240px]"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-navy">
                      <Clock3 size={16} />
                      {formatDateTime(event.date)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {levelPill(event.level)}
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                        {event.module}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-navy">{event.action}</h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                      {event.description}
                    </p>

                    <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-2">
                      <span>Referência: {event.reference || "-"}</span>
                      <span>Status: {event.status || "-"}</span>
                      <span>Passageiro: {event.passengerName || "-"}</span>
                      <span>Empresa: {event.companyName || "-"}</span>
                      <span className="md:col-span-2">Rota: {event.routeLabel || "-"}</span>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Ator
                    </p>
                    <p className="mt-1 text-sm font-black text-navy">{event.actor}</p>

                    <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Detalhes
                    </p>
                    <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-600">
                      {event.details || "-"}
                    </p>
                  </div>
                </article>
              ))}

              {filteredEvents.length === 0 && (
                <div className="px-6 py-12 text-center text-sm font-black text-slate-500">
                  Nenhum evento encontrado.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                <ShieldCheck size={24} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-black text-blue-900">
                  Módulo 74 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  Esta auditoria é consolidada a partir dos dados reais já existentes.
                  Quando criarmos uma tabela própria de auditoria no backend, esta
                  tela poderá consumir o endpoint oficial sem mudar o fluxo do usuário.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
