import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Download,
  FileBarChart,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  TicketCheck,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { extractApiError } from "../api/client";
import { getOperatorOverview } from "../api/operation";

function normalizeStatus(value) {
  return String(value || "").toUpperCase();
}

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

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isNaN(number) ? 0 : number);
}

function getPassengerName(item) {
  return (
    item.passengerName ||
    item.passengerFullName ||
    item.passenger?.fullName ||
    item.passenger?.name ||
    "-"
  );
}

function getCompanyName(item) {
  return (
    item.companyDisplayName ||
    item.companyTradeName ||
    item.companyName ||
    item.transportCompanyTradeName ||
    item.transportCompanyName ||
    item.transportCompany?.tradeName ||
    item.transportCompany?.name ||
    item.trip?.transportCompany?.tradeName ||
    item.trip?.transportCompany?.name ||
    "Sem empresa"
  );
}

function getTicketAmount(ticket) {
  return (
    ticket.amount ||
    ticket.totalAmount ||
    ticket.price ||
    ticket.paidAmount ||
    ticket.booking?.amount ||
    ticket.booking?.totalAmount ||
    ticket.booking?.price ||
    0
  );
}

function getBookingAmount(booking) {
  return (
    booking.amount ||
    booking.totalAmount ||
    booking.price ||
    booking.paidAmount ||
    0
  );
}

function getTripAmount(trip) {
  return trip.price || trip.priceAmount || trip.fare || 0;
}

function getOriginLabel(item) {
  return (
    item.originLabel ||
    item.originCity ||
    item.routeOrigin ||
    item.route?.originLabel ||
    item.route?.originCity ||
    item.trip?.originLabel ||
    item.trip?.route?.originLabel ||
    item.trip?.route?.originCity ||
    "-"
  );
}

function getDestinationLabel(item) {
  return (
    item.destinationLabel ||
    item.destinationCity ||
    item.routeDestination ||
    item.route?.destinationLabel ||
    item.route?.destinationCity ||
    item.trip?.destinationLabel ||
    item.trip?.route?.destinationLabel ||
    item.trip?.route?.destinationCity ||
    "-"
  );
}

function getRouteLabel(item) {
  if (item.routeLabel) {
    return item.routeLabel;
  }

  const origin = getOriginLabel(item);
  const destination = getDestinationLabel(item);

  if (origin !== "-" || destination !== "-") {
    return `${origin} → ${destination}`;
  }

  return "-";
}

function getItemStatus(item) {
  return normalizeStatus(
    item.status ||
      item.ticketStatus ||
      item.bookingStatus ||
      item.tripStatus
  );
}

function getItemDate(item) {
  return (
    item.usedAt ||
    item.boardedAt ||
    item.issuedAt ||
    item.departureAt ||
    item.departureDateTime ||
    item.createdAt ||
    item.updatedAt ||
    "-"
  );
}

function getDateOnly(value) {
  if (!value || value === "-") {
    return "";
  }

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
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
  const csvContent = rows
    .map((row) => row.map(csvEscape).join(";"))
    .join("\n");

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusPill(status) {
  const normalized = normalizeStatus(status);

  const styles = {
    ACTIVE: "bg-green-50 text-green-700 ring-green-200",
    VALID: "bg-green-50 text-green-700 ring-green-200",
    USED: "bg-amber-50 text-amber-700 ring-amber-200",
    TICKET_ISSUED: "bg-green-50 text-green-700 ring-green-200",
    PAID: "bg-green-50 text-green-700 ring-green-200",
    CONFIRMED: "bg-green-50 text-green-700 ring-green-200",
    PENDING_PAYMENT: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40",
    SCHEDULED: "bg-blue-50 text-blue-700 ring-blue-200",
    EXPIRED: "bg-red-50 text-red-700 ring-red-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    CANCELED: "bg-red-50 text-red-700 ring-red-200"
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

function ReportTable({ title, description, columns, rows, emptyText }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-7 py-6">
        <h2 className="text-2xl font-black text-navy">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-b border-slate-100 last:border-0"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-7 py-5 text-sm font-bold text-slate-700"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-7 py-10 text-center text-sm font-black text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SimpleBarList({ title, description, icon: Icon, rows, emptyText }) {
  const maxValue = Math.max(...rows.map((row) => Number(row.value || 0)), 1);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
      <div className="mb-6 flex items-start justify-between gap-5">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
            <Icon size={15} />
            Gráfico
          </div>

          <h2 className="text-2xl font-black text-navy">{title}</h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {rows.map((row) => {
          const percent = Math.max(
            4,
            Math.round((Number(row.value || 0) / maxValue) * 100)
          );

          return (
            <div key={row.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-navy">
                    {row.label}
                  </p>

                  {row.description && (
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {row.description}
                    </p>
                  )}
                </div>

                <p className="shrink-0 text-sm font-black text-navy">
                  {row.displayValue || row.value}
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-navy"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-black text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryGauge({ title, description, percent, value, icon: Icon }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
      <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
            <Icon size={15} />
            Indicador visual
          </div>

          <h2 className="text-2xl font-black text-navy">{title}</h2>

          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
            {description}
          </p>

          <p className="mt-5 text-4xl font-black text-navy">{value}</p>
        </div>

        <div className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full bg-slate-100">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#16a34a ${safePercent}%, #e2e8f0 ${safePercent}% 100%)`
            }}
          />

          <div className="relative grid h-28 w-28 place-items-center rounded-full bg-white shadow-sm">
            <div className="text-center">
              <p className="text-3xl font-black text-navy">{safePercent}%</p>
              <p className="text-xs font-black uppercase text-slate-400">
                taxa
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExecutiveSummary({
  revenue,
  trips,
  bookings,
  tickets,
  usedTickets,
  cancelledTickets,
  boardingRate,
  topCompany,
  periodLabel
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-yellowBrand/20 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-800">
          <FileBarChart size={15} />
          Resumo executivo
        </div>

        <h2 className="text-2xl font-black text-navy">
          Leitura rápida da operação
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Resumo automático baseado nos filtros aplicados.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Período analisado
          </p>
          <p className="mt-2 text-lg font-black text-navy">{periodLabel}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Receita estimada
          </p>
          <p className="mt-2 text-lg font-black text-navy">
            {formatMoney(revenue)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Volume operacional
          </p>
          <p className="mt-2 text-lg font-black text-navy">
            {trips} viagens · {bookings} reservas · {tickets} bilhetes
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Embarque
          </p>
          <p className="mt-2 text-lg font-black text-navy">
            {usedTickets} embarques · {boardingRate}% de taxa
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Cancelamentos
          </p>
          <p className="mt-2 text-lg font-black text-navy">
            {cancelledTickets} bilhetes cancelados/bloqueados
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Empresa em destaque
          </p>
          <p className="mt-2 text-lg font-black text-navy">
            {topCompany || "Sem volume no filtro atual"}
          </p>
        </div>
      </div>
    </section>
  );
}

function countByStatus(items) {
  return items.reduce((acc, item) => {
    const status = getItemStatus(item) || "SEM_STATUS";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

export default function ReportsPanel() {
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const companyOptions = useMemo(() => {
    const names = [...tickets, ...bookings, ...trips]
      .map((item) => getCompanyName(item))
      .filter((name) => name && name !== "Sem empresa" && name !== "-");

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [bookings, tickets, trips]);

  const statusOptions = useMemo(() => {
    const statuses = [...tickets, ...bookings, ...trips]
      .map((item) => getItemStatus(item))
      .filter(Boolean);

    return Array.from(new Set(statuses)).sort((a, b) => a.localeCompare(b));
  }, [bookings, tickets, trips]);

  function matchesPeriodFilter(item) {
    if (!startDate && !endDate) {
      return true;
    }

    const itemDate = getDateOnly(getItemDate(item));

    if (!itemDate) {
      return false;
    }

    const afterStart = !startDate || itemDate >= startDate;
    const beforeEnd = !endDate || itemDate <= endDate;

    return afterStart && beforeEnd;
  }

  function matchesCommonFilters(item) {
    const term = normalizeText(query);
    const company = getCompanyName(item);
    const status = getItemStatus(item);

    const matchesCompany =
      companyFilter === "ALL" || company === companyFilter;

    const matchesStatus = statusFilter === "ALL" || status === statusFilter;

    const matchesQuery =
      !term ||
      [
        item.ticketCode,
        item.bookingCode,
        item.code,
        item.id,
        getPassengerName(item),
        getCompanyName(item),
        getRouteLabel(item),
        status
      ]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(term));

    return (
      matchesCompany &&
      matchesStatus &&
      matchesQuery &&
      matchesPeriodFilter(item)
    );
  }

  const filteredTrips = useMemo(() => {
    if (!["ALL", "TRIPS"].includes(typeFilter)) {
      return [];
    }

    return trips.filter((trip) => matchesCommonFilters(trip));
  }, [
    trips,
    query,
    companyFilter,
    statusFilter,
    typeFilter,
    startDate,
    endDate
  ]);

  const filteredBookings = useMemo(() => {
    if (!["ALL", "BOOKINGS"].includes(typeFilter)) {
      return [];
    }

    return bookings.filter((booking) => matchesCommonFilters(booking));
  }, [
    bookings,
    query,
    companyFilter,
    statusFilter,
    typeFilter,
    startDate,
    endDate
  ]);

  const filteredTickets = useMemo(() => {
    if (!["ALL", "TICKETS", "BOARDINGS"].includes(typeFilter)) {
      return [];
    }

    const base = tickets.filter((ticket) => matchesCommonFilters(ticket));

    if (typeFilter === "BOARDINGS") {
      return base.filter((ticket) => getItemStatus(ticket) === "USED");
    }

    return base;
  }, [
    tickets,
    query,
    companyFilter,
    statusFilter,
    typeFilter,
    startDate,
    endDate
  ]);

  const report = useMemo(() => {
    const validTickets = filteredTickets.filter(
      (ticket) => getItemStatus(ticket) === "VALID"
    );

    const usedTickets = filteredTickets.filter(
      (ticket) => getItemStatus(ticket) === "USED"
    );

    const cancelledTickets = filteredTickets.filter((ticket) =>
      ["CANCELLED", "CANCELED"].includes(getItemStatus(ticket))
    );

    const pendingBookings = filteredBookings.filter(
      (booking) => getItemStatus(booking) === "PENDING_PAYMENT"
    );

    const revenue = filteredTickets.reduce((total, ticket) => {
      const status = getItemStatus(ticket);

      if (status === "CANCELLED" || status === "CANCELED") {
        return total;
      }

      const value = Number(getTicketAmount(ticket));
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);

    const ticketStatusMap = countByStatus(filteredTickets);
    const bookingStatusMap = countByStatus(filteredBookings);

    const companyMap = filteredTickets.reduce((acc, ticket) => {
      const company = getCompanyName(ticket);
      const amount = Number(getTicketAmount(ticket));
      const status = getItemStatus(ticket);

      if (!acc[company]) {
        acc[company] = {
          company,
          tickets: 0,
          used: 0,
          revenue: 0
        };
      }

      acc[company].tickets += 1;

      if (status === "USED") {
        acc[company].used += 1;
      }

      if (!["CANCELLED", "CANCELED"].includes(status)) {
        acc[company].revenue += Number.isNaN(amount) ? 0 : amount;
      }

      return acc;
    }, {});

    const topCompanies = Object.values(companyMap)
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 8);

    const latestBoardings = filteredTickets
      .filter((ticket) => getItemStatus(ticket) === "USED")
      .slice()
      .sort((a, b) => {
        const dateA = new Date(
          a.usedAt || a.boardedAt || a.updatedAt || 0
        ).getTime();
        const dateB = new Date(
          b.usedAt || b.boardedAt || b.updatedAt || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 8);

    return {
      validTickets,
      usedTickets,
      cancelledTickets,
      pendingBookings,
      revenue,
      ticketStatusMap,
      bookingStatusMap,
      topCompanies,
      latestBoardings
    };
  }, [filteredBookings, filteredTickets]);

  async function loadReports() {
    setLoading(true);
    setMessage(null);

    try {
      const overview = await getOperatorOverview();

      setTrips(overview.trips);
      setBookings(overview.bookings);
      setTickets(overview.tickets);

      const failedModules = Object.entries(overview.errors)
        .filter(([, error]) => Boolean(error))
        .map(([key]) => key);

      if (failedModules.length > 0) {
        setMessage({
          type: "warning",
          text: `Alguns dados não carregaram: ${failedModules.join(", ")}.`
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
    loadReports();
  }, []);

  function handleClearFilters() {
    setQuery("");
    setCompanyFilter("ALL");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setStartDate("");
    setEndDate("");
  }

  function handleExportCsv() {
    const rows = [
      [
        "Tipo",
        "Código",
        "Passageiro",
        "Empresa",
        "Rota",
        "Status",
        "Valor",
        "Data"
      ]
    ];

    if (["ALL", "TICKETS", "BOARDINGS"].includes(typeFilter)) {
      filteredTickets.forEach((ticket) => {
        rows.push([
          getItemStatus(ticket) === "USED" ? "Embarque" : "Bilhete",
          ticket.ticketCode || ticket.code || ticket.id || "-",
          getPassengerName(ticket),
          getCompanyName(ticket),
          getRouteLabel(ticket),
          getItemStatus(ticket),
          getTicketAmount(ticket),
          getItemDate(ticket)
        ]);
      });
    }

    if (["ALL", "BOOKINGS"].includes(typeFilter)) {
      filteredBookings.forEach((booking) => {
        rows.push([
          "Reserva",
          booking.bookingCode || booking.code || booking.id || "-",
          getPassengerName(booking),
          getCompanyName(booking),
          getRouteLabel(booking),
          getItemStatus(booking),
          getBookingAmount(booking),
          getItemDate(booking)
        ]);
      });
    }

    if (["ALL", "TRIPS"].includes(typeFilter)) {
      filteredTrips.forEach((trip) => {
        rows.push([
          "Viagem",
          trip.id || "-",
          "-",
          getCompanyName(trip),
          getRouteLabel(trip),
          getItemStatus(trip),
          getTripAmount(trip),
          getItemDate(trip)
        ]);
      });
    }

    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replaceAll(":", "-");

    downloadCsv(`vairapido-relatorios-${timestamp}.csv`, rows);
  }

  function buildPrintableReportHtml() {
    const generatedAt = formatDateTime(new Date().toISOString());
    const periodLabel =
      startDate || endDate
        ? `${startDate || "início"} até ${endDate || "hoje"}`
        : "Todos os períodos";

    const topCompany = report.topCompanies[0]?.company || "Sem empresa";
    const ticketStatusHtml = Object.entries(report.ticketStatusMap)
      .map(
        ([status, total]) => `
          <tr>
            <td>${escapeHtml(status)}</td>
            <td>${escapeHtml(total)}</td>
          </tr>
        `
      )
      .join("");

    const bookingStatusHtml = Object.entries(report.bookingStatusMap)
      .map(
        ([status, total]) => `
          <tr>
            <td>${escapeHtml(status)}</td>
            <td>${escapeHtml(total)}</td>
          </tr>
        `
      )
      .join("");

    const companyHtml = report.topCompanies
      .map(
        (company) => `
          <tr>
            <td>${escapeHtml(company.company)}</td>
            <td>${escapeHtml(company.tickets)}</td>
            <td>${escapeHtml(company.used)}</td>
            <td>${escapeHtml(formatMoney(company.revenue))}</td>
          </tr>
        `
      )
      .join("");

    const boardingHtml = report.latestBoardings
      .map(
        (ticket) => `
          <tr>
            <td>${escapeHtml(ticket.ticketCode || ticket.code || "-")}</td>
            <td>${escapeHtml(getPassengerName(ticket))}</td>
            <td>${escapeHtml(getRouteLabel(ticket))}</td>
            <td>${escapeHtml(getCompanyName(ticket))}</td>
            <td>${escapeHtml(formatDateTime(ticket.usedAt || ticket.boardedAt || ticket.updatedAt))}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório VaiRápido</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              color: #0A2540;
              background: #ffffff;
            }

            .header {
              background: #06213F;
              color: #ffffff;
              padding: 28px;
              border-bottom: 8px solid #FFC400;
              border-radius: 20px;
              margin-bottom: 24px;
            }

            .brand {
              font-size: 30px;
              font-weight: 900;
              margin: 0;
            }

            .subtitle {
              margin: 8px 0 0;
              color: #dbeafe;
              font-size: 14px;
              line-height: 1.6;
            }

            .meta {
              margin-top: 16px;
              font-size: 12px;
              color: #fef3c7;
              font-weight: 700;
            }

            .section {
              border: 1px solid #dbe3ef;
              border-radius: 18px;
              margin-bottom: 20px;
              overflow: hidden;
            }

            .section-title {
              padding: 18px 20px;
              border-bottom: 1px solid #dbe3ef;
              background: #f8fafc;
            }

            .section-title h2 {
              margin: 0;
              font-size: 18px;
              font-weight: 900;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 14px;
              margin-bottom: 20px;
            }

            .card {
              border: 1px solid #dbe3ef;
              border-radius: 18px;
              padding: 18px;
              background: #ffffff;
            }

            .card-label {
              margin: 0;
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 900;
              letter-spacing: .04em;
            }

            .card-value {
              margin: 10px 0 0;
              font-size: 24px;
              font-weight: 900;
              color: #0A2540;
            }

            .card-description {
              margin: 8px 0 0;
              font-size: 12px;
              color: #475569;
              line-height: 1.5;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th {
              text-align: left;
              background: #f8fafc;
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: .04em;
              padding: 12px 14px;
              border-bottom: 1px solid #dbe3ef;
            }

            td {
              padding: 12px 14px;
              border-bottom: 1px solid #eef2f7;
              font-size: 12px;
              vertical-align: top;
            }

            .summary {
              padding: 20px;
              font-size: 14px;
              line-height: 1.8;
            }

            .footer {
              margin-top: 30px;
              padding-top: 16px;
              border-top: 1px solid #dbe3ef;
              color: #64748b;
              font-size: 11px;
              text-align: center;
            }

            @media print {
              body {
                padding: 18px;
              }

              .header,
              .section,
              .card {
                break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1 class="brand">VaiRápido</h1>
            <p class="subtitle">
              Relatório executivo da operação — viagens, reservas, bilhetes, embarques e receita estimada.
            </p>
            <div class="meta">
              Gerado em ${escapeHtml(generatedAt)} · Período: ${escapeHtml(periodLabel)}
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <p class="card-label">Receita estimada</p>
              <p class="card-value">${escapeHtml(formatMoney(report.revenue))}</p>
              <p class="card-description">Baseada nos bilhetes filtrados.</p>
            </div>

            <div class="card">
              <p class="card-label">Viagens</p>
              <p class="card-value">${escapeHtml(filteredTrips.length)}</p>
              <p class="card-description">Total de viagens filtradas.</p>
            </div>

            <div class="card">
              <p class="card-label">Reservas</p>
              <p class="card-value">${escapeHtml(filteredBookings.length)}</p>
              <p class="card-description">${escapeHtml(report.pendingBookings.length)} pendentes.</p>
            </div>

            <div class="card">
              <p class="card-label">Bilhetes</p>
              <p class="card-value">${escapeHtml(filteredTickets.length)}</p>
              <p class="card-description">${escapeHtml(report.validTickets.length)} válidos para embarque.</p>
            </div>

            <div class="card">
              <p class="card-label">Embarques</p>
              <p class="card-value">${escapeHtml(report.usedTickets.length)}</p>
              <p class="card-description">Bilhetes já utilizados.</p>
            </div>

            <div class="card">
              <p class="card-label">Cancelados</p>
              <p class="card-value">${escapeHtml(report.cancelledTickets.length)}</p>
              <p class="card-description">Bilhetes bloqueados/cancelados.</p>
            </div>

            <div class="card">
              <p class="card-label">Taxa de embarque</p>
              <p class="card-value">${escapeHtml(boardingRate)}%</p>
              <p class="card-description">Usados em relação ao total filtrado.</p>
            </div>

            <div class="card">
              <p class="card-label">Empresa destaque</p>
              <p class="card-value" style="font-size: 16px;">${escapeHtml(topCompany)}</p>
              <p class="card-description">Maior volume no filtro atual.</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <h2>Resumo executivo</h2>
            </div>
            <div class="summary">
              No período analisado, a operação registrou <strong>${escapeHtml(filteredTrips.length)}</strong> viagens,
              <strong>${escapeHtml(filteredBookings.length)}</strong> reservas e
              <strong>${escapeHtml(filteredTickets.length)}</strong> bilhetes.
              A receita estimada foi de <strong>${escapeHtml(formatMoney(report.revenue))}</strong>.
              Foram identificados <strong>${escapeHtml(report.usedTickets.length)}</strong> embarques,
              com taxa visual de <strong>${escapeHtml(boardingRate)}%</strong>.
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <h2>Bilhetes por status</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${ticketStatusHtml || "<tr><td colspan='2'>Nenhum bilhete encontrado.</td></tr>"}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">
              <h2>Reservas por status</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${bookingStatusHtml || "<tr><td colspan='2'>Nenhuma reserva encontrada.</td></tr>"}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">
              <h2>Empresas com maior volume</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Bilhetes</th>
                  <th>Embarques</th>
                  <th>Receita estimada</th>
                </tr>
              </thead>
              <tbody>
                ${companyHtml || "<tr><td colspan='4'>Nenhuma empresa encontrada.</td></tr>"}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">
              <h2>Últimos embarques</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Bilhete</th>
                  <th>Passageiro</th>
                  <th>Rota</th>
                  <th>Empresa</th>
                  <th>Data de uso</th>
                </tr>
              </thead>
              <tbody>
                ${boardingHtml || "<tr><td colspan='5'>Nenhum embarque encontrado.</td></tr>"}
              </tbody>
            </table>
          </div>

          <div class="footer">
            VaiRápido · Relatório gerado automaticamente pelo Backoffice
          </div>
        </body>
      </html>
    `;
  }

  function handlePrintReport() {
    const html = buildPrintableReportHtml();
    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  const ticketStatusRows = Object.entries(report.ticketStatusMap).map(
    ([status, total]) => [statusPill(status), total]
  );

  const bookingStatusRows = Object.entries(report.bookingStatusMap).map(
    ([status, total]) => [statusPill(status), total]
  );

  const ticketChartRows = Object.entries(report.ticketStatusMap)
    .map(([status, total]) => ({
      label: status,
      value: total,
      description: "Bilhetes"
    }))
    .sort((a, b) => b.value - a.value);

  const bookingChartRows = Object.entries(report.bookingStatusMap)
    .map(([status, total]) => ({
      label: status,
      value: total,
      description: "Reservas"
    }))
    .sort((a, b) => b.value - a.value);

  const companyChartRows = report.topCompanies.map((item) => ({
    label: item.company,
    value: item.tickets,
    displayValue: `${item.tickets} bilhetes`,
    description: `${item.used} embarques · ${formatMoney(item.revenue)}`
  }));

  const boardingRate =
    filteredTickets.length > 0
      ? Math.round((report.usedTickets.length / filteredTickets.length) * 100)
      : 0;

  const periodLabel =
    startDate || endDate
      ? `${startDate || "início"} até ${endDate || "hoje"}`
      : "Todos os períodos";

  const companyRows = report.topCompanies.map((item) => [
    <div>
      <p className="font-black text-navy">{item.company}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">
        {item.tickets} bilhetes emitidos
      </p>
    </div>,
    item.used,
    formatMoney(item.revenue)
  ]);

  const boardingRows = report.latestBoardings.map((ticket) => [
    <div>
      <p className="break-all font-black text-navy">
        {ticket.ticketCode || ticket.code || "-"}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-500">
        {getPassengerName(ticket)}
      </p>
    </div>,
    getRouteLabel(ticket),
    getCompanyName(ticket),
    formatDateTime(ticket.usedAt || ticket.boardedAt || ticket.updatedAt)
  ]);

  return (
    <div className="grid gap-7">
      <section className="overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-7 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <FileBarChart size={16} />
                Relatórios
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
                Relatórios executivos da operação
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Consulte indicadores, gráficos, filtros, exportação CSV e
                relatório executivo em PDF/impressão.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-xs font-black uppercase text-blue-100">
                Módulo
              </p>
              <p className="mt-1 text-3xl font-black text-yellowBrand">62</p>
              <p className="text-sm font-bold text-white">
                Executivo e PDF
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
            message.type === "warning" ? "bg-yellowBrand/20 text-amber-800" : ""
          ].join(" ")}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <section className="flex items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-10 text-sm font-black text-slate-500 shadow-soft">
          <Loader2 className="animate-spin" size={22} />
          Carregando relatórios...
        </section>
      ) : (
        <>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                    <Filter size={15} />
                    Filtros
                  </div>

                  <h2 className="text-2xl font-black text-navy">
                    Filtros, período e exportação
                  </h2>

                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Refine os relatórios por período, empresa, status, tipo e
                    busca textual.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 font-black text-navy"
                  >
                    Limpar filtros
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 font-black text-navy"
                  >
                    <Printer size={18} />
                    Exportar PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-5 font-black text-white"
                  >
                    <Download size={18} />
                    Exportar CSV
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">Buscar</span>

                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />

                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                      placeholder="Bilhete, passageiro, rota..."
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">Empresa</span>

                  <select
                    value={companyFilter}
                    onChange={(event) => setCompanyFilter(event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  >
                    <option value="ALL">Todas as empresas</option>
                    {companyOptions.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">Status</span>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  >
                    <option value="ALL">Todos os status</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">Tipo</span>

                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  >
                    <option value="ALL">Tudo</option>
                    <option value="TICKETS">Bilhetes</option>
                    <option value="BOOKINGS">Reservas</option>
                    <option value="TRIPS">Viagens</option>
                    <option value="BOARDINGS">Embarques</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">
                    Data inicial
                  </span>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">
                    Data final
                  </span>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  />
                </label>
              </div>

              <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-600">
                Resultado filtrado: {filteredTrips.length} viagens ·{" "}
                {filteredBookings.length} reservas · {filteredTickets.length}{" "}
                bilhetes
                {(startDate || endDate) && (
                  <span>
                    {" "}
                    · Período: {startDate || "início"} até {endDate || "hoje"}
                  </span>
                )}
              </div>
            </div>
          </section>

          <ExecutiveSummary
            revenue={report.revenue}
            trips={filteredTrips.length}
            bookings={filteredBookings.length}
            tickets={filteredTickets.length}
            usedTickets={report.usedTickets.length}
            cancelledTickets={report.cancelledTickets.length}
            boardingRate={boardingRate}
            topCompany={report.topCompanies[0]?.company}
            periodLabel={periodLabel}
          />

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Receita estimada"
              value={formatMoney(report.revenue)}
              description="Baseada nos bilhetes filtrados."
              icon={WalletCards}
              tone="green"
            />

            <MetricCard
              title="Viagens"
              value={filteredTrips.length}
              description="Total de viagens filtradas."
              icon={CalendarClock}
              tone="blue"
            />

            <MetricCard
              title="Reservas"
              value={filteredBookings.length}
              description={`${report.pendingBookings.length} pendentes.`}
              icon={BarChart3}
              tone="yellow"
            />

            <MetricCard
              title="Bilhetes"
              value={filteredTickets.length}
              description={`${report.validTickets.length} válidos para embarque.`}
              icon={TicketCheck}
              tone="navy"
            />
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            <MetricCard
              title="Embarques"
              value={report.usedTickets.length}
              description="Bilhetes já utilizados."
              icon={CheckCircle2}
              tone="green"
            />

            <MetricCard
              title="Cancelados"
              value={report.cancelledTickets.length}
              description="Bilhetes bloqueados/cancelados."
              icon={AlertTriangle}
              tone="red"
            />

            <MetricCard
              title="Taxa de embarque"
              value={`${boardingRate}%`}
              description="Usados em relação ao total filtrado."
              icon={TrendingUp}
              tone="blue"
            />
          </section>

          <section className="grid gap-7 xl:grid-cols-2">
            <SummaryGauge
              title="Taxa visual de embarque"
              description="Mostra a proporção de bilhetes utilizados em relação ao total filtrado."
              percent={boardingRate}
              value={`${report.usedTickets.length} embarques`}
              icon={TrendingUp}
            />

            <SimpleBarList
              title="Empresas com maior volume"
              description="Ranking visual por quantidade de bilhetes emitidos."
              icon={Building2}
              rows={companyChartRows}
              emptyText="Nenhuma empresa encontrada nos filtros atuais."
            />
          </section>

          <section className="grid gap-7 xl:grid-cols-2">
            <SimpleBarList
              title="Bilhetes por status"
              description="Distribuição visual dos bilhetes filtrados."
              icon={TicketCheck}
              rows={ticketChartRows}
              emptyText="Nenhum bilhete encontrado."
            />

            <SimpleBarList
              title="Reservas por status"
              description="Distribuição visual das reservas filtradas."
              icon={BarChart3}
              rows={bookingChartRows}
              emptyText="Nenhuma reserva encontrada."
            />
          </section>

          <section className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-navy">
                Atualização dos relatórios
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Os dados são carregados diretamente do backend VaiRápido.
              </p>
            </div>

            <button
              type="button"
              onClick={loadReports}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 font-black text-navy"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </section>

          <section className="grid gap-7 xl:grid-cols-2">
            <ReportTable
              title="Bilhetes por status"
              description="Distribuição operacional dos bilhetes filtrados."
              columns={["Status", "Total"]}
              rows={ticketStatusRows}
              emptyText="Nenhum bilhete encontrado."
            />

            <ReportTable
              title="Reservas por status"
              description="Distribuição operacional das reservas filtradas."
              columns={["Status", "Total"]}
              rows={bookingStatusRows}
              emptyText="Nenhuma reserva encontrada."
            />
          </section>

          <ReportTable
            title="Empresas com maior volume"
            description="Ranking por quantidade de bilhetes emitidos."
            columns={["Empresa", "Embarques", "Receita estimada"]}
            rows={companyRows}
            emptyText="Nenhuma empresa encontrada nos bilhetes."
          />

          <ReportTable
            title="Últimos embarques"
            description="Últimos bilhetes utilizados no embarque."
            columns={["Bilhete", "Rota", "Empresa", "Data de uso"]}
            rows={boardingRows}
            emptyText="Nenhum embarque encontrado."
          />

          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                <Building2 size={25} strokeWidth={2.8} />
              </div>

              <div>
                <h3 className="text-lg font-black text-blue-900">
                  Próxima etapa dos relatórios
                </h3>

                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  Podemos adicionar gráficos por período e resumo financeiro por
                  rota.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}