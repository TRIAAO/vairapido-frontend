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
  Route as RouteIcon,
  Search,
  TicketCheck,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { extractApiError } from "../api/client";
import { getOperatorOverview } from "../api/operation";

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isCancelledStatus(status) {
  return ["CANCELLED", "CANCELED", "EXPIRED"].includes(normalizeStatus(status));
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

function formatDateLabel(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function formatMoney(value, currency = "BRL") {
  const number = Number(value || 0);
  const safeValue = Number.isNaN(number) ? 0 : number;
  const safeCurrency = String(currency || "BRL").trim().toUpperCase();

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: safeCurrency
    }).format(safeValue);
  } catch {
    return `${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeValue)} ${safeCurrency}`.trim();
  }
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("pt-BR").format(Number.isNaN(number) ? 0 : number);
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
    item.booking?.transportCompanyTradeName ||
    item.booking?.transportCompanyName ||
    item.booking?.companyTradeName ||
    item.booking?.companyName ||
    item.trip?.transportCompanyTradeName ||
    item.trip?.transportCompanyName ||
    item.trip?.transportCompany?.tradeName ||
    item.trip?.transportCompany?.name ||
    "Sem empresa"
  );
}

function getItemCurrency(item) {
  return (
    item.currency ||
    item.booking?.currency ||
    item.trip?.currency ||
    item.route?.currency ||
    "BRL"
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
    ticket.trip?.price ||
    ticket.trip?.priceAmount ||
    0
  );
}

function getBookingAmount(booking) {
  return (
    booking.amount ||
    booking.totalAmount ||
    booking.price ||
    booking.paidAmount ||
    booking.trip?.price ||
    booking.trip?.priceAmount ||
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
    item.booking?.originLabel ||
    item.booking?.originCity ||
    item.booking?.route?.originLabel ||
    item.booking?.route?.originCity ||
    item.trip?.originLabel ||
    item.trip?.originCity ||
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
    item.booking?.destinationLabel ||
    item.booking?.destinationCity ||
    item.booking?.route?.destinationLabel ||
    item.booking?.route?.destinationCity ||
    item.trip?.destinationLabel ||
    item.trip?.destinationCity ||
    item.trip?.route?.destinationLabel ||
    item.trip?.route?.destinationCity ||
    "-"
  );
}

function getRouteLabel(item) {
  if (item.routeLabel) {
    return item.routeLabel;
  }

  if (item.booking?.routeLabel) {
    return item.booking.routeLabel;
  }

  if (item.trip?.routeLabel) {
    return item.trip.routeLabel;
  }

  const origin = getOriginLabel(item);
  const destination = getDestinationLabel(item);

  if (origin !== "-" || destination !== "-") {
    return `${origin} → ${destination}`;
  }

  return "Rota não informada";
}

function getItemStatus(item) {
  return normalizeStatus(
    item.status || item.ticketStatus || item.bookingStatus || item.tripStatus
  );
}

function getTicketCode(ticket) {
  return ticket.ticketCode || ticket.code || ticket.id || "-";
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

function getBoardingDate(item) {
  return item.usedAt || item.boardedAt || item.updatedAt || getItemDate(item);
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function SectionHeading({ number, title, description, icon: Icon }) {
  return (
    <div className="mb-6 flex min-w-0 items-start gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy text-white">
        <Icon size={22} strokeWidth={2.8} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-yellowBrand">
          {number}
        </p>
        <h2 className="text-2xl font-black leading-tight text-navy">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
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

function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-black text-slate-500">
      {children}
    </div>
  );
}

function HorizontalBarList({ rows, emptyText, valueFormatter }) {
  const maxValue = Math.max(...rows.map((row) => Number(row.value || 0)), 1);

  if (rows.length === 0) {
    return <EmptyState>{emptyText}</EmptyState>;
  }

  return (
    <div className="grid min-w-0 gap-4">
      {rows.map((row) => {
        const percent = Math.max(
          4,
          Math.round((Number(row.value || 0) / maxValue) * 100)
        );

        return (
          <div key={row.label} className="grid min-w-0 gap-2">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-navy">{row.label}</p>
                {row.description && (
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    {row.description}
                  </p>
                )}
              </div>

              <p className="shrink-0 text-sm font-black text-navy">
                {row.displayValue || valueFormatter(row.value)}
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
    </div>
  );
}

function PeriodBarChart({ rows, emptyText, valueFormatter }) {
  const maxValue = Math.max(...rows.map((row) => Number(row.value || 0)), 1);

  if (rows.length === 0) {
    return <EmptyState>{emptyText}</EmptyState>;
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-full items-end gap-3">
        {rows.map((row) => {
          const height = Math.max(
            8,
            Math.round((Number(row.value || 0) / maxValue) * 100)
          );

          return (
            <div key={row.label} className="grid min-w-[72px] flex-1 gap-2">
              <div className="flex h-36 items-end rounded-2xl bg-slate-50 p-2">
                <div
                  className="w-full rounded-xl bg-navy"
                  style={{ height: `${height}%` }}
                  title={`${row.label}: ${valueFormatter(row.value)}`}
                />
              </div>

              <div className="text-center">
                <p className="text-xs font-black text-navy">{row.shortLabel}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  {valueFormatter(row.value)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportTable({ columns, rows, emptyText }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => (
              <th
                key={column}
                className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-100 last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-5 py-4 text-sm font-bold leading-6 text-slate-700"
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
                className="px-5 py-10 text-center text-sm font-black text-slate-500"
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InsightCard({ title, children, icon: Icon }) {
  return (
    <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-5 flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-navy">
          <Icon size={21} strokeWidth={2.8} />
        </div>
        <h3 className="min-w-0 text-xl font-black text-navy">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function ReportsPanel() {
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const allItems = useMemo(
    () => [...tickets, ...bookings, ...trips],
    [bookings, tickets, trips]
  );

  const displayCurrency = useMemo(() => {
    const itemWithCurrency = allItems.find((item) => getItemCurrency(item));
    return getItemCurrency(itemWithCurrency || {});
  }, [allItems]);

  const companyOptions = useMemo(() => {
    const names = allItems
      .map((item) => getCompanyName(item))
      .filter((name) => name && name !== "Sem empresa" && name !== "-");

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const statusOptions = useMemo(() => {
    const statuses = allItems.map((item) => getItemStatus(item)).filter(Boolean);

    return Array.from(new Set(statuses)).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  function matchesPeriodFilter(item, customDate) {
    if (!startDate && !endDate) {
      return true;
    }

    const itemDate = getDateOnly(customDate || getItemDate(item));

    if (!itemDate) {
      return false;
    }

    const afterStart = !startDate || itemDate >= startDate;
    const beforeEnd = !endDate || itemDate <= endDate;

    return afterStart && beforeEnd;
  }

  function matchesCommonFilters(item, customDate) {
    const term = normalizeText(query);
    const company = getCompanyName(item);
    const status = getItemStatus(item);

    const matchesCompany = companyFilter === "ALL" || company === companyFilter;
    const matchesStatus = statusFilter === "ALL" || status === statusFilter;
    const matchesQuery =
      !term ||
      [
        getTicketCode(item),
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
      matchesCompany && matchesStatus && matchesQuery && matchesPeriodFilter(item, customDate)
    );
  }

  const filteredTrips = useMemo(
    () => trips.filter((trip) => matchesCommonFilters(trip, trip.departureAt)),
    [trips, query, companyFilter, statusFilter, startDate, endDate]
  );

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => matchesCommonFilters(booking)),
    [bookings, query, companyFilter, statusFilter, startDate, endDate]
  );

  const filteredTickets = useMemo(
    () => tickets.filter((ticket) => matchesCommonFilters(ticket)),
    [tickets, query, companyFilter, statusFilter, startDate, endDate]
  );

  const report = useMemo(() => {
    const validTickets = filteredTickets.filter(
      (ticket) => getItemStatus(ticket) === "VALID"
    );
    const usedTickets = filteredTickets.filter(
      (ticket) => getItemStatus(ticket) === "USED"
    );
    const revenueTickets = filteredTickets.filter(
      (ticket) => !isCancelledStatus(getItemStatus(ticket))
    );
    const cancelledTickets = filteredTickets.filter((ticket) =>
      isCancelledStatus(getItemStatus(ticket))
    );
    const pendingBookings = filteredBookings.filter(
      (booking) => getItemStatus(booking) === "PENDING_PAYMENT"
    );

    const revenue = revenueTickets.reduce((total, ticket) => {
      const value = Number(getTicketAmount(ticket));
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);

    const routeMap = revenueTickets.reduce((acc, ticket) => {
      const route = getRouteLabel(ticket) || "Rota não informada";
      const amount = Number(getTicketAmount(ticket));
      const status = getItemStatus(ticket);

      if (!acc[route]) {
        acc[route] = {
          label: route,
          route,
          revenue: 0,
          tickets: 0,
          boardings: 0,
          currency: getItemCurrency(ticket)
        };
      }

      acc[route].tickets += 1;
      acc[route].revenue += Number.isNaN(amount) ? 0 : amount;

      if (status === "USED") {
        acc[route].boardings += 1;
      }

      return acc;
    }, {});

    const companyMap = revenueTickets.reduce((acc, ticket) => {
      const company = getCompanyName(ticket) || "Sem empresa";
      const amount = Number(getTicketAmount(ticket));
      const status = getItemStatus(ticket);

      if (!acc[company]) {
        acc[company] = {
          label: company,
          company,
          revenue: 0,
          tickets: 0,
          boardings: 0,
          currency: getItemCurrency(ticket)
        };
      }

      acc[company].tickets += 1;
      acc[company].revenue += Number.isNaN(amount) ? 0 : amount;

      if (status === "USED") {
        acc[company].boardings += 1;
      }

      return acc;
    }, {});

    const revenueByDateMap = revenueTickets.reduce((acc, ticket) => {
      const date = getDateOnly(getItemDate(ticket));
      const amount = Number(getTicketAmount(ticket));

      if (!date) {
        return acc;
      }

      if (!acc[date]) {
        acc[date] = {
          label: date,
          shortLabel: formatDateLabel(date),
          value: 0,
          tickets: 0
        };
      }

      acc[date].value += Number.isNaN(amount) ? 0 : amount;
      acc[date].tickets += 1;

      return acc;
    }, {});

    const boardingsByDateMap = usedTickets.reduce((acc, ticket) => {
      const date = getDateOnly(getBoardingDate(ticket));

      if (!date) {
        return acc;
      }

      if (!acc[date]) {
        acc[date] = {
          label: date,
          shortLabel: formatDateLabel(date),
          value: 0,
          tickets: []
        };
      }

      acc[date].value += 1;
      acc[date].tickets.push(ticket);

      return acc;
    }, {});

    const routeFinancial = Object.values(routeMap).sort(
      (a, b) => b.revenue - a.revenue
    );
    const companyRevenue = Object.values(companyMap).sort(
      (a, b) => b.revenue - a.revenue
    );
    const revenueByDate = Object.values(revenueByDateMap).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    const boardingsByDate = Object.values(boardingsByDateMap).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    return {
      validTickets,
      usedTickets,
      cancelledTickets,
      pendingBookings,
      revenue,
      routeFinancial,
      companyRevenue,
      revenueByDate,
      boardingsByDate
    };
  }, [filteredBookings, filteredTickets]);

  const routeFinancialRows = report.routeFinancial.slice(0, 8).map((item) => ({
    label: item.route,
    value: item.revenue,
    displayValue: formatMoney(item.revenue, item.currency || displayCurrency),
    description: `${formatNumber(item.tickets)} bilhetes · ${formatNumber(
      item.boardings
    )} embarques`
  }));

  const companyRevenueRows = report.companyRevenue.slice(0, 8).map((item) => ({
    label: item.company,
    value: item.revenue,
    displayValue: formatMoney(item.revenue, item.currency || displayCurrency),
    description: `${formatNumber(item.tickets)} bilhetes · ${formatNumber(
      item.boardings
    )} embarques`
  }));

  const revenuePeriodRows = report.revenueByDate.slice(-12).map((item) => ({
    ...item,
    displayValue: formatMoney(item.value, displayCurrency)
  }));

  const boardingDayRows = report.boardingsByDate.slice(-12).map((item) => ({
    ...item,
    displayValue: `${formatNumber(item.value)} embarques`
  }));

  const routeTableRows = report.routeFinancial.slice(0, 6).map((item) => [
    <div className="min-w-0">
      <p className="max-w-[320px] truncate font-black text-navy">{item.route}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">
        {formatNumber(item.tickets)} bilhetes emitidos
      </p>
    </div>,
    formatMoney(item.revenue, item.currency || displayCurrency),
    formatNumber(item.boardings)
  ]);

  const companyTableRows = report.companyRevenue.slice(0, 6).map((item) => [
    <div className="min-w-0">
      <p className="max-w-[280px] truncate font-black text-navy">{item.company}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">
        {formatNumber(item.tickets)} bilhetes
      </p>
    </div>,
    formatMoney(item.revenue, item.currency || displayCurrency),
    formatNumber(item.boardings)
  ]);

  const boardingTableRows = report.boardingsByDate.slice(-6).reverse().map((item) => [
    formatDateLabel(item.label),
    `${formatNumber(item.value)} embarques`,
    item.tickets
      .slice(0, 2)
      .map((ticket) => getTicketCode(ticket))
      .join(", ") || "-"
  ]);

  const boardingRate =
    filteredTickets.length > 0
      ? Math.round((report.usedTickets.length / filteredTickets.length) * 100)
      : 0;

  const periodLabel =
    startDate || endDate
      ? `${startDate || "início"} até ${endDate || "hoje"}`
      : "Todos os períodos";

  const topRoute = report.routeFinancial[0]?.route || "Sem rota com receita";
  const topCompany = report.companyRevenue[0]?.company || "Sem empresa com receita";

  async function loadReports() {
    setLoading(true);
    setMessage(null);

    try {
      const overview = await getOperatorOverview();

      setTrips(Array.isArray(overview.trips) ? overview.trips : []);
      setBookings(Array.isArray(overview.bookings) ? overview.bookings : []);
      setTickets(Array.isArray(overview.tickets) ? overview.tickets : []);

      const failedModules = Object.entries(overview.errors || {})
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
    setStartDate("");
    setEndDate("");
  }

  function handleExportCsv() {
    const rows = [
      ["Seção", "Categoria", "Receita", "Bilhetes", "Embarques", "Data"]
    ];

    report.routeFinancial.forEach((item) => {
      rows.push([
        "Financeiro por rota",
        item.route,
        item.revenue,
        item.tickets,
        item.boardings,
        ""
      ]);
    });

    report.revenueByDate.forEach((item) => {
      rows.push([
        "Gráfico por período",
        "Receita por data",
        item.value,
        item.tickets,
        "",
        item.label
      ]);
    });

    report.companyRevenue.forEach((item) => {
      rows.push([
        "Receita por empresa",
        item.company,
        item.revenue,
        item.tickets,
        item.boardings,
        ""
      ]);
    });

    report.boardingsByDate.forEach((item) => {
      rows.push([
        "Embarques por dia",
        "Embarques",
        "",
        "",
        item.value,
        item.label
      ]);
    });

    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    downloadCsv(`vairapido-modulo-67-relatorios-${timestamp}.csv`, rows);
  }

  function buildPrintableReportHtml() {
    const generatedAt = formatDateTime(new Date().toISOString());

    const routeRows = report.routeFinancial
      .slice(0, 10)
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.route)}</td>
            <td>${escapeHtml(formatMoney(item.revenue, item.currency || displayCurrency))}</td>
            <td>${escapeHtml(item.tickets)}</td>
            <td>${escapeHtml(item.boardings)}</td>
          </tr>
        `
      )
      .join("");

    const periodRows = report.revenueByDate
      .slice(-12)
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(formatDateLabel(item.label))}</td>
            <td>${escapeHtml(formatMoney(item.value, displayCurrency))}</td>
            <td>${escapeHtml(item.tickets)}</td>
          </tr>
        `
      )
      .join("");

    const companyRows = report.companyRevenue
      .slice(0, 10)
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.company)}</td>
            <td>${escapeHtml(formatMoney(item.revenue, item.currency || displayCurrency))}</td>
            <td>${escapeHtml(item.tickets)}</td>
            <td>${escapeHtml(item.boardings)}</td>
          </tr>
        `
      )
      .join("");

    const boardingRows = report.boardingsByDate
      .slice(-12)
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(formatDateLabel(item.label))}</td>
            <td>${escapeHtml(item.value)}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório VaiRápido - Módulo 67</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, Helvetica, sans-serif;
              color: #0A2540;
              background: #ffffff;
            }
            .header {
              background: #06213F;
              color: #ffffff;
              padding: 26px;
              border-bottom: 8px solid #FFC400;
              border-radius: 20px;
              margin-bottom: 22px;
            }
            .brand { font-size: 30px; font-weight: 900; margin: 0; }
            .subtitle { margin: 8px 0 0; color: #dbeafe; font-size: 13px; line-height: 1.6; }
            .meta { margin-top: 14px; font-size: 12px; color: #fef3c7; font-weight: 700; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #dbe3ef; border-radius: 18px; padding: 16px; }
            .label { margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900; letter-spacing: .04em; }
            .value { margin: 8px 0 0; font-size: 20px; font-weight: 900; color: #0A2540; }
            .section { border: 1px solid #dbe3ef; border-radius: 18px; margin-bottom: 18px; overflow: hidden; }
            .section-title { padding: 16px 18px; border-bottom: 1px solid #dbe3ef; background: #f8fafc; }
            .section-title h2 { margin: 0; font-size: 17px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; background: #f8fafc; color: #64748b; font-size: 11px; padding: 12px; text-transform: uppercase; }
            td { padding: 12px; border-top: 1px solid #eef2f7; font-size: 12px; vertical-align: top; }
            .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #dbe3ef; color: #64748b; font-size: 11px; text-align: center; }
            @media print {
              body { padding: 18px; }
              .header, .section, .card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="brand">VaiRápido</h1>
            <p class="subtitle">Módulo 67 — financeiro por rota, gráfico por período, receita por empresa e embarques por dia.</p>
            <div class="meta">Gerado em ${escapeHtml(generatedAt)} · Período: ${escapeHtml(periodLabel)}</div>
          </div>

          <div class="grid">
            <div class="card"><p class="label">Receita estimada</p><p class="value">${escapeHtml(formatMoney(report.revenue, displayCurrency))}</p></div>
            <div class="card"><p class="label">Rotas com receita</p><p class="value">${escapeHtml(report.routeFinancial.length)}</p></div>
            <div class="card"><p class="label">Empresas com receita</p><p class="value">${escapeHtml(report.companyRevenue.length)}</p></div>
            <div class="card"><p class="label">Embarques</p><p class="value">${escapeHtml(report.usedTickets.length)}</p></div>
          </div>

          <div class="section">
            <div class="section-title"><h2>1. Financeiro por rota</h2></div>
            <table><thead><tr><th>Rota</th><th>Receita</th><th>Bilhetes</th><th>Embarques</th></tr></thead><tbody>${routeRows || "<tr><td colspan='4'>Nenhuma rota encontrada.</td></tr>"}</tbody></table>
          </div>

          <div class="section">
            <div class="section-title"><h2>2. Gráficos por período</h2></div>
            <table><thead><tr><th>Data</th><th>Receita</th><th>Bilhetes</th></tr></thead><tbody>${periodRows || "<tr><td colspan='3'>Nenhum período encontrado.</td></tr>"}</tbody></table>
          </div>

          <div class="section">
            <div class="section-title"><h2>3. Receita por empresa</h2></div>
            <table><thead><tr><th>Empresa</th><th>Receita</th><th>Bilhetes</th><th>Embarques</th></tr></thead><tbody>${companyRows || "<tr><td colspan='4'>Nenhuma empresa encontrada.</td></tr>"}</tbody></table>
          </div>

          <div class="section">
            <div class="section-title"><h2>4. Embarques por dia</h2></div>
            <table><thead><tr><th>Data</th><th>Embarques</th></tr></thead><tbody>${boardingRows || "<tr><td colspan='2'>Nenhum embarque encontrado.</td></tr>"}</tbody></table>
          </div>

          <div class="footer">VaiRápido · Relatório gerado automaticamente pelo Backoffice</div>
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

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <FileBarChart size={16} />
                Módulo 67
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Relatórios financeiros e operacionais
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Visão limpa para receita por rota, evolução por período, receita por empresa e embarques por dia.
              </p>
            </div>

            <div className="grid shrink-0 gap-2 rounded-3xl bg-white/10 p-4 text-sm font-bold text-blue-100">
              <span>Período</span>
              <strong className="text-lg text-yellowBrand">{periodLabel}</strong>
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
          Carregando relatórios...
        </section>
      ) : (
        <>
          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                  <Filter size={15} />
                  Filtros
                </div>
                <h2 className="text-2xl font-black text-navy">Controle do relatório</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Use poucos filtros para manter a leitura objetiva e segura em 100% de zoom.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-navy"
                >
                  Limpar
                </button>

                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy"
                >
                  <Printer size={18} />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-5 text-sm font-black text-white"
                >
                  <Download size={18} />
                  CSV
                </button>
              </div>
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
                    placeholder="Rota, empresa, bilhete ou passageiro"
                  />
                </div>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Empresa</span>
                <select
                  value={companyFilter}
                  onChange={(event) => setCompanyFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todas</option>
                  {companyOptions.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todos</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
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

              <div className="flex items-end lg:col-span-2">
                <button
                  type="button"
                  onClick={loadReports}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 text-sm font-black text-navy"
                >
                  <RefreshCw size={18} />
                  Atualizar dados
                </button>
              </div>
            </div>
          </section>

          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Receita estimada"
              value={formatMoney(report.revenue, displayCurrency)}
              description="Baseada nos bilhetes filtrados."
              icon={WalletCards}
              tone="green"
            />
            <MetricCard
              title="Rotas com receita"
              value={formatNumber(report.routeFinancial.length)}
              description={topRoute}
              icon={RouteIcon}
              tone="navy"
            />
            <MetricCard
              title="Empresas"
              value={formatNumber(report.companyRevenue.length)}
              description={topCompany}
              icon={Building2}
              tone="blue"
            />
            <MetricCard
              title="Embarques"
              value={formatNumber(report.usedTickets.length)}
              description={`${boardingRate}% dos bilhetes filtrados.`}
              icon={CheckCircle2}
              tone="yellow"
            />
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <SectionHeading
              number="01"
              title="Financeiro por rota"
              description="Ranking limpo das rotas que mais geram receita no período filtrado."
              icon={RouteIcon}
            />

            <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_0.95fr]">
              <InsightCard title="Receita por rota" icon={WalletCards}>
                <HorizontalBarList
                  rows={routeFinancialRows}
                  emptyText="Nenhuma rota com receita no filtro atual."
                  valueFormatter={(value) => formatMoney(value, displayCurrency)}
                />
              </InsightCard>

              <InsightCard title="Ranking financeiro" icon={BarChart3}>
                <ReportTable
                  columns={["Rota", "Receita", "Embarques"]}
                  rows={routeTableRows}
                  emptyText="Nenhuma rota encontrada."
                />
              </InsightCard>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <SectionHeading
              number="02"
              title="Gráficos por período"
              description="Evolução da receita estimada por data, sem excesso de indicadores na tela."
              icon={TrendingUp}
            />

            <InsightCard title="Receita por período" icon={CalendarClock}>
              <PeriodBarChart
                rows={revenuePeriodRows}
                emptyText="Nenhuma receita encontrada no período selecionado."
                valueFormatter={(value) => formatMoney(value, displayCurrency)}
              />
            </InsightCard>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <SectionHeading
              number="03"
              title="Receita por empresa"
              description="Comparativo das empresas com maior volume financeiro dentro dos filtros aplicados."
              icon={Building2}
            />

            <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_0.95fr]">
              <InsightCard title="Empresas por receita" icon={Building2}>
                <HorizontalBarList
                  rows={companyRevenueRows}
                  emptyText="Nenhuma empresa com receita no filtro atual."
                  valueFormatter={(value) => formatMoney(value, displayCurrency)}
                />
              </InsightCard>

              <InsightCard title="Ranking das empresas" icon={TicketCheck}>
                <ReportTable
                  columns={["Empresa", "Receita", "Embarques"]}
                  rows={companyTableRows}
                  emptyText="Nenhuma empresa encontrada."
                />
              </InsightCard>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <SectionHeading
              number="04"
              title="Embarques por dia"
              description="Volume diário de bilhetes utilizados no embarque, útil para operação e fiscalização."
              icon={CheckCircle2}
            />

            <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_0.95fr]">
              <InsightCard title="Movimento diário" icon={TrendingUp}>
                <PeriodBarChart
                  rows={boardingDayRows}
                  emptyText="Nenhum embarque encontrado no período selecionado."
                  valueFormatter={(value) => `${formatNumber(value)} emb.`}
                />
              </InsightCard>

              <InsightCard title="Últimos dias com embarque" icon={CalendarClock}>
                <ReportTable
                  columns={["Dia", "Embarques", "Bilhetes"]}
                  rows={boardingTableRows}
                  emptyText="Nenhum embarque encontrado."
                />
              </InsightCard>
            </div>
          </section>

          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                <AlertTriangle size={24} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-black text-blue-900">
                  Módulo 67 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  A tela foi reorganizada para leitura profissional, com foco nos quatro blocos definidos e sem excesso de informação visual.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
