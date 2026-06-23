import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bus,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageCircle,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  TicketCheck,
  TrendingUp,
  Users,
  WalletCards
} from "lucide-react";
import { extractApiError } from "../api/client";
import { getOperatorOverview } from "../api/operation";

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

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "BRL 0,00";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(number);
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
    "-"
  );
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

function getDepartureAt(item) {
  return (
    item.departureAt ||
    item.departureDateTime ||
    item.tripDepartureAt ||
    item.trip?.departureAt ||
    item.trip?.departureDateTime ||
    null
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

function statusPill(status) {
  const normalized = normalizeStatus(status);

  const styles = {
    ACTIVE: "bg-green-50 text-green-700 ring-green-200",
    VALID: "bg-green-50 text-green-700 ring-green-200",
    TICKET_ISSUED: "bg-green-50 text-green-700 ring-green-200",
    CONFIRMED: "bg-green-50 text-green-700 ring-green-200",
    PAID: "bg-green-50 text-green-700 ring-green-200",
    USED: "bg-amber-50 text-amber-700 ring-amber-200",
    SCHEDULED: "bg-blue-50 text-blue-700 ring-blue-200",
    PENDING_PAYMENT: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40",
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

        <div className={`grid h-13 w-13 place-items-center rounded-2xl ${tones[tone]}`}>
          <Icon size={26} strokeWidth={2.8} />
        </div>
      </div>
    </article>
  );
}

function ActionCard({ title, description, icon: Icon, buttonLabel, href }) {
  return (
    <a
      href={href}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-navy/10 text-navy">
        <Icon size={28} strokeWidth={2.8} />
      </div>

      <h3 className="mt-5 text-xl font-black text-navy">{title}</h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-navy">
        {buttonLabel}
      </div>
    </a>
  );
}

export default function DashboardPage() {
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const metrics = useMemo(() => {
    const validTickets = tickets.filter(
      (ticket) => normalizeStatus(ticket.status || ticket.ticketStatus) === "VALID"
    ).length;

    const usedTickets = tickets.filter(
      (ticket) => normalizeStatus(ticket.status || ticket.ticketStatus) === "USED"
    ).length;

    const cancelledTickets = tickets.filter((ticket) =>
      ["CANCELLED", "CANCELED"].includes(normalizeStatus(ticket.status || ticket.ticketStatus))
    ).length;

    const pendingBookings = bookings.filter(
      (booking) => normalizeStatus(booking.status || booking.bookingStatus) === "PENDING_PAYMENT"
    ).length;

    const issuedBookings = bookings.filter(
      (booking) => normalizeStatus(booking.status || booking.bookingStatus) === "TICKET_ISSUED"
    ).length;

    const revenue = tickets.reduce((total, ticket) => {
      const status = normalizeStatus(ticket.status || ticket.ticketStatus);

      if (status === "CANCELLED" || status === "CANCELED") {
        return total;
      }

      const value = Number(getTicketAmount(ticket));
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);

    const occupancy =
      tickets.length > 0 ? Math.round((usedTickets / tickets.length) * 100) : 0;

    return {
      trips: trips.length,
      bookings: bookings.length,
      tickets: tickets.length,
      validTickets,
      usedTickets,
      cancelledTickets,
      pendingBookings,
      issuedBookings,
      revenue,
      occupancy
    };
  }, [bookings, tickets, trips]);

  const latestTickets = useMemo(() => {
    const term = query.trim().toLowerCase();

    const sorted = [...tickets].sort((a, b) => {
      const dateA = new Date(a.issuedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.issuedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const filtered = term
      ? sorted.filter((ticket) =>
          [
            ticket.ticketCode,
            ticket.bookingCode,
            ticket.status,
            ticket.ticketStatus,
            getPassengerName(ticket),
            getRouteLabel(ticket)
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        )
      : sorted;

    return filtered.slice(0, 6);
  }, [query, tickets]);

  const nextTrips = useMemo(() => {
    const term = query.trim().toLowerCase();

    const sorted = [...trips].sort((a, b) => {
      const dateA = new Date(getDepartureAt(a) || 0).getTime();
      const dateB = new Date(getDepartureAt(b) || 0).getTime();
      return dateA - dateB;
    });

    const filtered = term
      ? sorted.filter((trip) =>
          [getRouteLabel(trip), getCompanyName(trip), trip.status, trip.id]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        )
      : sorted;

    return filtered.slice(0, 6);
  }, [query, trips]);

  async function loadDashboard() {
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
    loadDashboard();
  }, []);

  return (
    <div className="grid gap-7">
      <section className="overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-7 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <BarChart3 size={16} />
                Visão geral
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
                Dashboard real da operação
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Acompanhe viagens, reservas, bilhetes, embarques, ocupação e receita estimada com dados reais do backend.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-xs font-black uppercase text-blue-100">
                Ambiente
              </p>
              <p className="mt-1 text-3xl font-black text-yellowBrand">
                Backoffice
              </p>
              <p className="text-sm font-bold text-white">
                Gestão integrada
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
          Carregando dashboard...
        </section>
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Viagens"
              value={metrics.trips}
              description="Total de viagens cadastradas."
              icon={CalendarClock}
              tone="blue"
            />

            <MetricCard
              title="Reservas"
              value={metrics.bookings}
              description={`${metrics.pendingBookings} pendentes de pagamento.`}
              icon={ClipboardList}
              tone="yellow"
            />

            <MetricCard
              title="Bilhetes"
              value={metrics.tickets}
              description={`${metrics.validTickets} válidos para embarque.`}
              icon={TicketCheck}
              tone="green"
            />

            <MetricCard
              title="Embarques"
              value={metrics.usedTickets}
              description="Bilhetes já utilizados."
              icon={CheckCircle2}
              tone="navy"
            />
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Receita estimada"
              value={formatMoney(metrics.revenue)}
              description="Somatório estimado dos bilhetes."
              icon={WalletCards}
              tone="green"
            />

            <MetricCard
              title="Ocupação"
              value={`${metrics.occupancy}%`}
              description="Baseada em bilhetes utilizados."
              icon={TrendingUp}
              tone="blue"
            />

            <MetricCard
              title="Emitidas"
              value={metrics.issuedBookings}
              description="Reservas com bilhete emitido."
              icon={ShieldCheck}
              tone="navy"
            />

            <MetricCard
              title="Cancelados"
              value={metrics.cancelledTickets}
              description="Bilhetes cancelados."
              icon={AlertTriangle}
              tone="red"
            />
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-navy">
                  Controle rápido
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Pesquise dados do dashboard ou atualize os indicadores.
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
                    className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10 sm:w-96"
                    placeholder="Buscar por rota, passageiro, bilhete..."
                  />
                </div>

                <button
                  type="button"
                  onClick={loadDashboard}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 font-black text-navy"
                >
                  <RefreshCw size={18} />
                  Atualizar
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <ActionCard
              title="Painel do Fiscal"
              description="Consultar bilhetes, validar documentos e marcar embarque."
              icon={ShieldCheck}
              buttonLabel="Acessar fiscal"
              href="/fiscal"
            />

            <ActionCard
              title="Operação"
              description="Acompanhar viagens, reservas, passageiros e disponibilidade."
              icon={Bus}
              buttonLabel="Ver operação"
              href="/operador"
            />

            <ActionCard
              title="Relatórios"
              description="Conferir indicadores financeiros, operacionais e de embarque."
              icon={MessageCircle}
              buttonLabel="Abrir relatórios"
              href="/relatorios"
            />
          </section>

          <section className="grid gap-7 xl:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
              <div className="border-b border-slate-200 px-7 py-6">
                <h2 className="text-2xl font-black text-navy">
                  Próximas viagens
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Primeiras viagens encontradas no backend.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {nextTrips.map((trip) => (
                  <div key={trip.id || `${getRouteLabel(trip)}-${getDepartureAt(trip)}`} className="p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black text-navy">
                          {getRouteLabel(trip)}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {getCompanyName(trip)}
                        </p>
                      </div>

                      {statusPill(trip.status)}
                    </div>

                    <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Route size={17} className="text-slate-400" />
                      Saída: {formatDateTime(getDepartureAt(trip))}
                    </div>
                  </div>
                ))}

                {nextTrips.length === 0 && (
                  <div className="p-10 text-center text-sm font-black text-slate-500">
                    Nenhuma viagem encontrada.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
              <div className="border-b border-slate-200 px-7 py-6">
                <h2 className="text-2xl font-black text-navy">
                  Últimos bilhetes
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Bilhetes mais recentes da operação.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {latestTickets.map((ticket) => (
                  <div key={ticket.id || ticket.ticketCode} className="p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="break-all text-lg font-black text-navy">
                          {ticket.ticketCode || ticket.code || "-"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {getPassengerName(ticket)}
                        </p>
                      </div>

                      {statusPill(ticket.status || ticket.ticketStatus)}
                    </div>

                    <div className="mt-5 grid gap-3 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-2">
                        <Bus size={17} className="text-slate-400" />
                        {getRouteLabel(ticket)}
                      </div>

                      <div className="flex items-center gap-2">
                        <TicketCheck size={17} className="text-slate-400" />
                        Emitido em {formatDateTime(ticket.issuedAt || ticket.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}

                {latestTickets.length === 0 && (
                  <div className="p-10 text-center text-sm font-black text-slate-500">
                    Nenhum bilhete encontrado.
                  </div>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}