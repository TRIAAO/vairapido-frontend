import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Building2,
  Clock3,
  Download,
  Globe2,
  Loader2,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  TicketCheck,
  WalletCards
} from "lucide-react";
import { extractApiError } from "../api/client";
import { getExecutiveDashboard } from "../api/executiveDashboard";

function formatMoney(amount, currency) {
  const value = Number(amount || 0);
  if (currency === "AOA") return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 2 }).format(value);
  if (currency === "BRL") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
  return `${currency || "N/A"} ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}`;
}

function formatRevenue(revenue = {}) {
  const entries = Object.entries(revenue);
  if (!entries.length) return "-";
  return entries.map(([cur, val]) => formatMoney(val, cur)).join(" · ");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).replaceAll('"', '""');
  return text.includes(";") || text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text}"` : text;
}

function downloadCsv(filename, rows) {
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvEscape).join(";")).join("\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
          <h3 className="mt-3 break-words text-2xl font-black tracking-tight text-navy lg:text-3xl">{value}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone] || tones.navy}`}>
          <Icon size={23} strokeWidth={2.8} />
        </div>
      </div>
    </article>
  );
}

function ProgressBar({ label, value, max, description }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-navy">{label}</span>
        <span className="text-xs font-black text-slate-500">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-yellowBrand" style={{ width: `${percent}%` }} />
      </div>
      {description && <p className="text-xs font-bold leading-5 text-slate-500">{description}</p>}
    </div>
  );
}

function CountryButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black ring-1 transition",
        active ? "bg-yellowBrand text-navy ring-yellowBrand" : "bg-white text-slate-600 ring-slate-200"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RankingBlock({ title, subtitle, icon: Icon, items }) {
  const max = Math.max(...items.map((item) => item.count), 0);
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy"><Icon size={22} strokeWidth={2.8} /></div>
        <div><h3 className="text-xl font-black text-navy">{title}</h3><p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{subtitle}</p></div>
      </div>
      <div className="grid gap-4">
        {items.length ? items.map((item) => (
          <ProgressBar key={item.label} label={item.label} value={item.count} max={max} description={formatRevenue(item.revenue)} />
        )) : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-black text-slate-500">Sem dados suficientes.</p>}
      </div>
    </article>
  );
}

export default function ExecutiveDashboardPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  async function loadDashboard() {
    setLoading(true);
    setMessage(null);
    try {
      setDashboard(await getExecutiveDashboard());
    } catch (error) {
      setMessage({ type: "error", text: extractApiError(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const countries = dashboard?.countries || [];
  const filteredCountries = useMemo(() => {
    const term = query.trim().toLowerCase();
    return countries.filter((country) => {
      const matchesCountry = selectedCountry === "ALL" || country.country === selectedCountry;
      const matchesQuery = !term || [country.country, country.currency, ...country.routes.map((item) => item.label), ...country.companies.map((item) => item.label)].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      return matchesCountry && matchesQuery;
    });
  }, [countries, query, selectedCountry]);

  const totals = useMemo(() => filteredCountries.reduce((acc, country) => {
    acc.bookings += country.bookings;
    acc.pendingBookings += country.pendingBookings;
    acc.tickets += country.tickets;
    acc.usedTickets += country.usedTickets;
    acc.whatsapp += country.whatsapp;
    acc.whatsappPending += country.whatsappPending;
    acc.incidents += country.incidents;
    acc.criticalIncidents += country.criticalIncidents;
    Object.entries(country.revenue).forEach(([cur, val]) => acc.revenue[cur] = (acc.revenue[cur] || 0) + val);
    return acc;
  }, { bookings: 0, pendingBookings: 0, tickets: 0, usedTickets: 0, whatsapp: 0, whatsappPending: 0, incidents: 0, criticalIncidents: 0, revenue: {} }), [filteredCountries]);

  const activities = useMemo(() => filteredCountries.flatMap((country) => country.activity.map((activity) => ({ ...activity, country: country.country, flag: country.flag }))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12), [filteredCountries]);

  function handleExportCsv() {
    const rows = [["País", "Moeda", "Reservas", "Reservas pendentes", "Bilhetes", "Embarques", "WhatsApp", "WhatsApp pendentes", "Ocorrências", "Críticas", "Receita"], ...filteredCountries.map((country) => [country.country, country.currency, country.bookings, country.pendingBookings, country.tickets, country.usedTickets, country.whatsapp, country.whatsappPending, country.incidents, country.criticalIncidents, formatRevenue(country.revenue)])];
    downloadCsv(`vairapido-dashboard-executivo-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.csv`, rows);
  }

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand"><BarChart3 size={16} />Módulo 77</div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">Dashboard executivo multi-país</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">Visão executiva para Brasil e Angola sem misturar moedas: receita, reservas, bilhetes, WhatsApp e ocorrências.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button type="button" onClick={loadDashboard} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white"><RefreshCw size={18} />Atualizar</button>
              <button type="button" onClick={handleExportCsv} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy"><Download size={18} />CSV</button>
            </div>
          </div>
        </div>
      </section>

      {message && <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-black text-red-700">{message.text}</div>}

      {loading ? (
        <section className="flex min-h-56 items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-10 text-sm font-black text-slate-500 shadow-soft"><Loader2 className="animate-spin" size={22} />Carregando dashboard executivo...</section>
      ) : (
        <>
          <section className="grid min-w-0 gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                <CountryButton active={selectedCountry === "ALL"} onClick={() => setSelectedCountry("ALL")}><Globe2 size={17} />Todos</CountryButton>
                {countries.map((country) => <CountryButton key={country.country} active={selectedCountry === country.country} onClick={() => setSelectedCountry(country.country)}><span>{country.flag}</span>{country.country}</CountryButton>)}
              </div>
              <div className="relative min-w-0 xl:w-96"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10" placeholder="Buscar país, rota ou empresa..." /></div>
            </div>
          </section>

          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Receita executiva" value={formatRevenue(totals.revenue)} description="Moedas separadas por país." icon={Banknote} tone="green" />
            <MetricCard title="Reservas" value={totals.bookings} description={`${totals.pendingBookings} pendente(s).`} icon={WalletCards} tone="navy" />
            <MetricCard title="Bilhetes" value={totals.tickets} description={`${totals.usedTickets} embarque(s).`} icon={TicketCheck} tone="blue" />
            <MetricCard title="Ocorrências" value={totals.incidents} description={`${totals.criticalIncidents} crítica(s).`} icon={ShieldAlert} tone={totals.criticalIncidents > 0 ? "red" : "yellow"} />
          </section>

          <section className="grid min-w-0 gap-5 xl:grid-cols-2">
            {filteredCountries.map((country) => (
              <article key={country.country} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">País executivo</p><h3 className="mt-2 text-2xl font-black text-navy">{country.flag} {country.country}</h3></div><div className="rounded-3xl bg-yellowBrand px-5 py-4 text-navy"><p className="text-xs font-black uppercase">Moeda</p><p className="text-2xl font-black">{country.currency}</p></div></div>
                <div className="mb-5 rounded-3xl bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Receita confirmada</p><p className="mt-2 text-2xl font-black text-navy">{formatRevenue(country.revenue)}</p></div>
                <div className="grid gap-4">
                  <ProgressBar label="Reservas pagas/emitidas" value={country.paidBookings} max={country.bookings} description={`${country.bookings} reserva(s) no total.`} />
                  <ProgressBar label="Embarques" value={country.usedTickets} max={country.tickets} description={`${country.tickets} bilhete(s) no total.`} />
                  <ProgressBar label="WhatsApp enviados" value={country.whatsappSent} max={country.whatsapp} description={`${country.whatsappPending} mensagem(ns) pendente(s).`} />
                  <ProgressBar label="Ocorrências críticas" value={country.criticalIncidents} max={Math.max(country.incidents, 1)} description={`${country.incidents} ocorrência(s) identificada(s).`} />
                </div>
              </article>
            ))}
          </section>

          <section className="grid min-w-0 gap-5 xl:grid-cols-2">
            {filteredCountries.map((country) => <RankingBlock key={`${country.country}-routes`} title={`${country.flag} Rotas em destaque`} subtitle="Ranking por volume operacional." icon={Route} items={country.routes} />)}
            {filteredCountries.map((country) => <RankingBlock key={`${country.country}-companies`} title={`${country.flag} Empresas em destaque`} subtitle="Ranking por volume e receita." icon={Building2} items={country.companies} />)}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-2xl font-black text-navy">Atividade recente</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Últimos movimentos operacionais dentro do filtro atual.</p></div>
            <div className="grid">
              {activities.length ? activities.map((activity) => (
                <article key={activity.id} className="grid gap-4 border-b border-slate-100 px-6 py-5 last:border-0 lg:grid-cols-[180px_1fr_180px]">
                  <div><p className="flex items-center gap-2 text-sm font-black text-navy"><Clock3 size={16} />{formatDateTime(activity.date)}</p><p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{activity.flag} {activity.type}</p></div>
                  <div className="min-w-0"><h3 className="text-lg font-black text-navy">{activity.title}</h3><p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{activity.description}</p><p className="mt-2 text-xs font-black text-slate-400">Status: {activity.status || "-"} · Ref: {activity.ref || "-"}</p></div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Valor</p><p className="mt-1 text-sm font-black text-navy">{activity.amount ? formatMoney(activity.amount, activity.currency) : "-"}</p></div>
                </article>
              )) : <div className="px-6 py-12 text-center text-sm font-black text-slate-500">Nenhuma atividade recente encontrada.</div>}
            </div>
          </section>

          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6"><div className="flex gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700"><AlertTriangle size={24} strokeWidth={2.8} /></div><div><h3 className="text-lg font-black text-blue-900">Módulo 77 aplicado</h3><p className="mt-1 text-sm font-semibold leading-6 text-blue-800">A receita global é apresentada por moeda para evitar leitura financeira incorreta entre Brasil e Angola.</p></div></div></section>
        </>
      )}
    </div>
  );
}
