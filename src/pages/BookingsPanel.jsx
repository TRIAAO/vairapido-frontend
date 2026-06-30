import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Armchair,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  TicketCheck,
  WalletCards,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  cancelBooking,
  confirmBookingPayment,
  expireOverdueBookings,
  issueBookingTicket,
  listBookings,
  listBookingsByCompany
} from "../api/bookings";
import { getCurrentUser } from "../utils/auth";

const statusLabels = {
  PENDING_PAYMENT: "Pendente",
  PAID: "Pago",
  TICKET_ISSUED: "Bilhete emitido",
  CANCELLED: "Cancelada",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada"
};

const statusOptions = [
  "PENDING_PAYMENT",
  "PAID",
  "TICKET_ISSUED",
  "CANCELLED",
  "EXPIRED"
];

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function getBookingId(booking) {
  return booking.id || booking.bookingId || "";
}

function getCompanyName(booking) {
  return (
    booking.companyTradeName ||
    booking.companyName ||
    booking.transportCompanyTradeName ||
    booking.transportCompanyName ||
    booking.trip?.transportCompanyTradeName ||
    booking.trip?.transportCompanyName ||
    "Sem empresa"
  );
}

function getPassengerName(booking) {
  return (
    booking.passengerName ||
    booking.passengerFullName ||
    booking.passenger?.fullName ||
    booking.passenger?.name ||
    "-"
  );
}

function getPassengerDocument(booking) {
  return (
    booking.passengerDocument ||
    booking.passenger?.document ||
    booking.passenger?.documentNumber ||
    "-"
  );
}

function getPassengerWhatsapp(booking) {
  return (
    booking.passengerWhatsapp ||
    booking.passengerPhone ||
    booking.passenger?.whatsapp ||
    booking.passenger?.phone ||
    "-"
  );
}

function getRouteLabel(booking) {
  const origin =
    booking.originCity ||
    booking.originLabel ||
    booking.route?.originCity ||
    booking.trip?.originCity ||
    booking.trip?.route?.originCity ||
    "-";

  const destination =
    booking.destinationCity ||
    booking.destinationLabel ||
    booking.route?.destinationCity ||
    booking.trip?.destinationCity ||
    booking.trip?.route?.destinationCity ||
    "-";

  return `${origin} → ${destination}`;
}

function getRouteFullLabel(booking) {
  const originCity =
    booking.originCity ||
    booking.originLabel ||
    booking.route?.originCity ||
    booking.trip?.originCity ||
    booking.trip?.route?.originCity ||
    "-";

  const originState = booking.originState ? `/${booking.originState}` : "";
  const originTerminal = booking.originTerminal ? ` · ${booking.originTerminal}` : "";

  const destinationCity =
    booking.destinationCity ||
    booking.destinationLabel ||
    booking.route?.destinationCity ||
    booking.trip?.destinationCity ||
    booking.trip?.route?.destinationCity ||
    "-";

  const destinationState = booking.destinationState
    ? `/${booking.destinationState}`
    : "";
  const destinationTerminal = booking.destinationTerminal
    ? ` · ${booking.destinationTerminal}`
    : "";

  return `${originCity}${originState}${originTerminal} → ${destinationCity}${destinationState}${destinationTerminal}`;
}

function getAmount(booking) {
  return booking.amount || booking.totalAmount || booking.price || booking.paidAmount || 0;
}

function getCurrency(booking) {
  return String(booking.currency || booking.trip?.currency || "BRL").toUpperCase();
}

function getCountryByCurrency(currency) {
  const normalized = String(currency || "").toUpperCase();

  if (normalized === "AOA") {
    return "Angola";
  }

  if (normalized === "BRL") {
    return "Brasil";
  }

  return "Outro país";
}

function formatMoney(value, currency = "BRL") {
  const number = Number(value || 0);
  const safeValue = Number.isNaN(number) ? 0 : number;
  const safeCurrency = String(currency || "BRL").toUpperCase();

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

function isActionLoading(changingId, booking) {
  return changingId === getBookingId(booking);
}

function statusPill(status) {
  const normalized = normalizeStatus(status);

  const styles = {
    PENDING_PAYMENT: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40",
    PAID: "bg-green-50 text-green-700 ring-green-200",
    TICKET_ISSUED: "bg-blue-50 text-blue-700 ring-blue-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    CANCELED: "bg-red-50 text-red-700 ring-red-200",
    EXPIRED: "bg-slate-100 text-slate-700 ring-slate-200"
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
        styles[normalized] || "bg-slate-100 text-slate-700 ring-slate-200"
      ].join(" ")}
    >
      {statusLabels[normalized] || normalized || "-"}
    </span>
  );
}

function MetricCard({ title, value, description, icon: Icon, tone = "navy" }) {
  const tones = {
    navy: "bg-navy/10 text-navy",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellowBrand/20 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    slate: "bg-slate-100 text-slate-700"
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

function ActionButton({ children, onClick, disabled, tone = "navy" }) {
  const tones = {
    navy: "bg-navy text-white disabled:bg-slate-300",
    green: "bg-green-600 text-white disabled:bg-slate-300",
    yellow: "bg-yellowBrand text-navy disabled:bg-slate-300",
    red: "bg-red-50 text-red-700 ring-1 ring-red-200 disabled:bg-slate-100 disabled:text-slate-400"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-10 items-center justify-center rounded-2xl px-4 text-xs font-black transition disabled:cursor-not-allowed",
        tones[tone]
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function BookingsPanel() {
  const currentUser = getCurrentUser();

  const [bookings, setBookings] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const isAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "ROLE_ADMIN";

  const currencyOptions = useMemo(() => {
    const currencies = bookings.map((booking) => getCurrency(booking)).filter(Boolean);
    return Array.from(new Set(currencies)).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  const metrics = useMemo(() => {
    const pending = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "PENDING_PAYMENT"
    );
    const paid = bookings.filter((booking) => normalizeStatus(booking.status) === "PAID");
    const issued = bookings.filter(
      (booking) => normalizeStatus(booking.status) === "TICKET_ISSUED"
    );
    const cancelled = bookings.filter((booking) =>
      ["CANCELLED", "CANCELED", "EXPIRED"].includes(normalizeStatus(booking.status))
    );

    const byCurrency = bookings.reduce((acc, booking) => {
      const currency = getCurrency(booking);
      const amount = Number(getAmount(booking));

      if (!acc[currency]) {
        acc[currency] = {
          currency,
          country: getCountryByCurrency(currency),
          total: 0,
          count: 0
        };
      }

      if (!["CANCELLED", "CANCELED", "EXPIRED"].includes(normalizeStatus(booking.status))) {
        acc[currency].total += Number.isNaN(amount) ? 0 : amount;
      }

      acc[currency].count += 1;
      return acc;
    }, {});

    return {
      total: bookings.length,
      pending: pending.length,
      paid: paid.length,
      issued: issued.length,
      cancelled: cancelled.length,
      byCurrency: Object.values(byCurrency)
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const term = normalizeText(query);

    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const currency = getCurrency(booking);

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesCurrency =
        currencyFilter === "ALL" || currency === currencyFilter;

      const matchesQuery =
        !term ||
        [
          booking.id,
          booking.bookingCode,
          getPassengerName(booking),
          getPassengerDocument(booking),
          getPassengerWhatsapp(booking),
          getCompanyName(booking),
          getRouteLabel(booking),
          status,
          currency,
          getCountryByCurrency(currency)
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));

      return matchesStatus && matchesCurrency && matchesQuery;
    });
  }, [bookings, currencyFilter, query, statusFilter]);

  async function loadBookings() {
    setLoading(true);
    setMessage(null);
    setAccessDenied(false);

    try {
      let data = [];

      if (isAdmin) {
        data = await listBookings();
      } else if (currentUser?.transportCompanyId) {
        data = await listBookingsByCompany(currentUser.transportCompanyId);
      } else {
        data = await listBookings();
      }

      setBookings(Array.isArray(data) ? data : []);
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
    loadBookings();
  }, []);

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setCurrencyFilter("ALL");
  }

  async function handleConfirmPayment(booking) {
    const bookingId = getBookingId(booking);
    const confirmed = window.confirm(
      `Confirmar pagamento da reserva ${booking.bookingCode || bookingId}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(bookingId);
    setMessage(null);

    try {
      await confirmBookingPayment(bookingId);

      setMessage({
        type: "success",
        text: "Pagamento confirmado com sucesso."
      });

      await loadBookings();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleIssueTicket(booking) {
    const bookingId = getBookingId(booking);
    const confirmed = window.confirm(
      `Emitir bilhete para a reserva ${booking.bookingCode || bookingId}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(bookingId);
    setMessage(null);

    try {
      await issueBookingTicket(bookingId);

      setMessage({
        type: "success",
        text: "Bilhete emitido com sucesso."
      });

      await loadBookings();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleCancel(booking) {
    const bookingId = getBookingId(booking);
    const confirmed = window.confirm(
      `Cancelar a reserva ${booking.bookingCode || bookingId}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(bookingId);
    setMessage(null);

    try {
      await cancelBooking(bookingId);

      setMessage({
        type: "success",
        text: "Reserva cancelada com sucesso."
      });

      await loadBookings();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleExpireOverdue() {
    const confirmed = window.confirm("Expirar reservas vencidas agora?");

    if (!confirmed) {
      return;
    }

    setChangingId("expire-overdue");
    setMessage(null);

    try {
      const response = await expireOverdueBookings();

      setMessage({
        type: "success",
        text:
          response?.message ||
          `Reservas vencidas processadas. Total expirado: ${
            response?.expiredBookings ?? "-"
          }.`
      });

      await loadBookings();
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
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <ClipboardList size={16} />
                Módulo 68
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Gestão real de reservas
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Acompanhe reservas do WhatsApp, status de pagamento, passageiro,
                viagem, assento, moeda e emissão de bilhete.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadBookings}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white"
              >
                <RefreshCw size={18} />
                Atualizar
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleExpireOverdue}
                  disabled={changingId === "expire-overdue"}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {changingId === "expire-overdue" ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <CalendarClock size={18} />
                  )}
                  Expirar vencidas
                </button>
              )}
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
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
          <div className="flex gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle size={24} strokeWidth={2.8} />
            </div>

            <div>
              <h2 className="text-xl font-black text-amber-900">Acesso restrito</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
                A listagem de reservas depende do perfil e do vínculo com a
                empresa de transporte.
              </p>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <section className="flex min-h-56 items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-10 text-sm font-black text-slate-500 shadow-soft">
          <Loader2 className="animate-spin" size={22} />
          Carregando reservas...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Reservas"
              value={metrics.total}
              description="Total carregado no painel."
              icon={ClipboardList}
              tone="navy"
            />

            <MetricCard
              title="Pendentes"
              value={metrics.pending}
              description="Aguardando pagamento."
              icon={WalletCards}
              tone="yellow"
            />

            <MetricCard
              title="Pagas"
              value={metrics.paid}
              description="Prontas para emissão."
              icon={CheckCircle2}
              tone="green"
            />

            <MetricCard
              title="Bilhetes emitidos"
              value={metrics.issued}
              description={`${metrics.cancelled} canceladas/expiradas.`}
              icon={TicketCheck}
              tone="blue"
            />
          </section>

          {metrics.byCurrency.length > 0 && (
            <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {metrics.byCurrency.map((item) => (
                <article
                  key={item.currency}
                  className="rounded-3xl border border-blue-100 bg-blue-50 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    {item.country} · {item.currency}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-navy">
                    {formatMoney(item.total, item.currency)}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-blue-800">
                    {item.count} reservas nesta moeda. Não misturar moedas.
                  </p>
                </article>
              ))}
            </section>
          )}

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                  <Search size={15} />
                  Filtros
                </div>

                <h2 className="text-2xl font-black text-navy">Controle das reservas</h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Filtros enxutos para manter a tela limpa em 100% de zoom.
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
                    placeholder="Código, passageiro, documento, rota..."
                  />
                </div>
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
                      {statusLabels[status] || status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">País/Moeda</span>

                <select
                  value={currencyFilter}
                  onChange={(event) => setCurrencyFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todos</option>
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {getCountryByCurrency(currency)} · {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-black text-navy">Reservas encontradas</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {filteredBookings.length} reserva(s) no filtro atual.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Reserva
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Passageiro
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Rota
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Empresa
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Valor
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => {
                    const bookingId = getBookingId(booking);
                    const status = normalizeStatus(booking.status);
                    const currency = getCurrency(booking);
                    const loadingAction = isActionLoading(changingId, booking);

                    const canConfirmPayment = status === "PENDING_PAYMENT";
                    const canIssueTicket = status === "PAID";
                    const canCancel = !["CANCELLED", "CANCELED", "EXPIRED", "TICKET_ISSUED"].includes(status);

                    return (
                      <tr
                        key={bookingId || booking.bookingCode}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="break-all text-sm font-black text-navy">
                              {booking.bookingCode || bookingId}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Criada: {formatDateTime(booking.createdAt)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Expira: {formatDateTime(booking.expiresAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="text-sm font-black text-navy">
                              {getPassengerName(booking)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Doc: {getPassengerDocument(booking)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              WhatsApp: {getPassengerWhatsapp(booking)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="max-w-[240px] text-sm font-black text-navy">
                              {getRouteLabel(booking)}
                            </p>
                            <p className="max-w-[240px] text-xs font-bold leading-5 text-slate-500">
                              {getRouteFullLabel(booking)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Saída: {formatDateTime(booking.departureAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="max-w-[200px] truncate text-sm font-black text-navy">
                              {getCompanyName(booking)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {getCountryByCurrency(currency)} · {currency}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Assento: {valueOrDash(booking.seatNumber)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <p className="text-sm font-black text-navy">
                            {formatMoney(getAmount(booking), currency)}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {booking.passengerFareType || "Tarifa padrão"}
                          </p>
                        </td>

                        <td className="px-5 py-5 align-top">
                          {statusPill(status)}
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="flex min-w-[280px] flex-wrap gap-2">
                            <ActionButton
                              tone="green"
                              disabled={!canConfirmPayment || loadingAction}
                              onClick={() => handleConfirmPayment(booking)}
                            >
                              {loadingAction ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                "Confirmar"
                              )}
                            </ActionButton>

                            <ActionButton
                              tone="yellow"
                              disabled={!canIssueTicket || loadingAction}
                              onClick={() => handleIssueTicket(booking)}
                            >
                              Emitir bilhete
                            </ActionButton>

                            <ActionButton
                              tone="red"
                              disabled={!canCancel || loadingAction}
                              onClick={() => handleCancel(booking)}
                            >
                              Cancelar
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBookings.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm font-black text-slate-500"
                      >
                        Nenhuma reserva encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                <ShieldCheck size={24} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-black text-blue-900">
                  Módulo 68 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  A tela separa as reservas por país/moeda para evitar soma incorreta
                  entre Brasil/BRL e Angola/AOA.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
