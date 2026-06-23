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

  const ticketStatusRows = Object.entries(report.ticketStatusMap).map(
    ([status, total]) => [statusPill(status), total]
  );

  const bookingStatusRows = Object.entries(report.bookingStatusMap).map(
    ([status, total]) => [statusPill(status), total]
  );

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
                Relatórios reais da operação
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Consulte indicadores de viagens, reservas, bilhetes, embarques,
                receita estimada e desempenho por empresa.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-xs font-black uppercase text-blue-100">
                Módulo
              </p>
              <p className="mt-1 text-3xl font-black text-yellowBrand">60</p>
              <p className="text-sm font-bold text-white">
                Período e CSV
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
              value={
                filteredTickets.length > 0
                  ? `${Math.round(
                      (report.usedTickets.length / filteredTickets.length) *
                        100
                    )}%`
                  : "0%"
              }
              description="Usados em relação ao total filtrado."
              icon={TrendingUp}
              tone="blue"
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
                  Podemos adicionar exportação PDF, gráficos visuais e resumo
                  executivo para administração.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}