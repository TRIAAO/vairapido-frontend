import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bus,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Route,
  Search,
  TicketCheck,
  Users,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import { getOperatorOverview } from "../api/operation";

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

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
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

function getArrivalAt(item) {
  return (
    item.arrivalAt ||
    item.arrivalDateTime ||
    item.tripArrivalAt ||
    item.trip?.arrivalAt ||
    item.trip?.arrivalDateTime ||
    null
  );
}

function getSeatLabel(item) {
  const seat = item.seatLabel || item.seatNumber || item.booking?.seatNumber;

  if (!seat) {
    return "-";
  }

  return String(seat).toLowerCase().includes("poltrona")
    ? seat
    : `Poltrona ${seat}`;
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

function SectionTitle({ title, description }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-navy">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function OperatorPanel() {
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const metrics = useMemo(() => {
    const usedTickets = tickets.filter((ticket) => normalizeStatus(ticket.status || ticket.ticketStatus) === "USED").length;
    const validTickets = tickets.filter((ticket) => normalizeStatus(ticket.status || ticket.ticketStatus) === "VALID").length;
    const pendingBookings = bookings.filter((booking) => normalizeStatus(booking.status || booking.bookingStatus) === "PENDING_PAYMENT").length;

    return {
      trips: trips.length,
      bookings: bookings.length,
      tickets: tickets.length,
      usedTickets,
      validTickets,
      pendingBookings
    };
  }, [trips, bookings, tickets]);

  const filteredTrips = useMemo(() => {
    const term = query.trim().toLowerCase();

    const sorted = [...trips].sort((a, b) => {
      const dateA = new Date(getDepartureAt(a) || 0).getTime();
      const dateB = new Date(getDepartureAt(b) || 0).getTime();
      return dateA - dateB;
    });

    if (!term) {
      return sorted.slice(0, 8);
    }

    return sorted
      .filter((trip) =>
        [
          getRouteLabel(trip),
          getCompanyName(trip),
          trip.status,
          trip.id
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [query, trips]);

  const filteredBookings = useMemo(() => {
    const term = query.trim().toLowerCase();

    const sorted = [...bookings].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });

    if (!term) {
      return sorted.slice(0, 8);
    }

    return sorted
      .filter((booking) =>
        [
          booking.bookingCode,
          booking.status,
          getPassengerName(booking),
          getRouteLabel(booking),
          getCompanyName(booking)
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [bookings, query]);

  const filteredTickets = useMemo(() => {
    const term = query.trim().toLowerCase();

    const sorted = [...tickets].sort((a, b) => {
      const dateA = new Date(a.issuedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.issuedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    if (!term) {
      return sorted.slice(0, 8);
    }

    return sorted
      .filter((ticket) =>
        [
          ticket.ticketCode,
          ticket.status,
          ticket.ticketStatus,
          ticket.bookingCode,
          getPassengerName(ticket),
          getRouteLabel(ticket)
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [query, tickets]);

  async function loadOverview() {
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
    loadOverview();
  }, []);

  return (
    <div className="grid gap-7">
      <section className="overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-7 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <ClipboardList size={16} />
                Operação
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
                Painel operacional real
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Acompanhe viagens, reservas, bilhetes e embarques com dados carregados do backend.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-xs font-black uppercase text-blue-100">
                Módulo
              </p>
              <p className="mt-1 text-3xl font-black text-yellowBrand">
                56
              </p>
              <p className="text-sm font-bold text-white">
                Operador real
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

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Viagens"
          value={metrics.trips}
          description="Viagens cadastradas."
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle
            title="Busca operacional"
            description="Pesquise por código, passageiro, rota, empresa ou status."
          />

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
                placeholder="Buscar na operação..."
              />
            </div>

            <button
              type="button"
              onClick={loadOverview}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 font-black text-navy"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="flex items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-10 text-sm font-black text-slate-500 shadow-soft">
          <Loader2 className="animate-spin" size={22} />
          Carregando operação...
        </section>
      ) : (
        <>
          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 px-7 py-6">
              <SectionTitle
                title="Próximas viagens"
                description="Viagens cadastradas e ordenadas pela data de saída."
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Rota</th>
                    <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Empresa</th>
                    <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Saída</th>
                    <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Chegada</th>
                    <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Preço</th>
                    <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id || `${getRouteLabel(trip)}-${getDepartureAt(trip)}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-7 py-5">
                        <div className="flex gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                            <Route size={22} strokeWidth={2.8} />
                          </div>

                          <div>
                            <p className="text-sm font-black text-navy">{getRouteLabel(trip)}</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">{trip.id || "-"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-700">{getCompanyName(trip)}</td>
                      <td className="px-7 py-5 text-sm font-bold text-slate-700">{formatDateTime(getDepartureAt(trip))}</td>
                      <td className="px-7 py-5 text-sm font-bold text-slate-700">{formatDateTime(getArrivalAt(trip))}</td>
                      <td className="px-7 py-5 text-sm font-bold text-slate-700">{formatMoney(trip.price || trip.priceAmount || trip.fare)}</td>
                      <td className="px-7 py-5">{statusPill(trip.status)}</td>
                    </tr>
                  ))}

                  {filteredTrips.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-7 py-10 text-center text-sm font-black text-slate-500">
                        Nenhuma viagem encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-7 xl:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
              <div className="border-b border-slate-200 px-7 py-6">
                <SectionTitle
                  title="Últimas reservas"
                  description="Reservas recentes feitas no sistema."
                />
              </div>

              <div className="divide-y divide-slate-100">
                {filteredBookings.map((booking) => (
                  <div key={booking.id || booking.bookingCode} className="p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black text-navy">
                          {booking.bookingCode || booking.code || "-"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {getPassengerName(booking)}
                        </p>
                      </div>

                      {statusPill(booking.status || booking.bookingStatus)}
                    </div>

                    <div className="mt-5 grid gap-3 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-2">
                        <Bus size={17} className="text-slate-400" />
                        {getRouteLabel(booking)}
                      </div>

                      <div className="flex items-center gap-2">
                        <Users size={17} className="text-slate-400" />
                        {getSeatLabel(booking)}
                      </div>

                      <div className="flex items-center gap-2">
                        <CalendarClock size={17} className="text-slate-400" />
                        {formatDateTime(booking.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredBookings.length === 0 && (
                  <div className="p-10 text-center text-sm font-black text-slate-500">
                    Nenhuma reserva encontrada.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
              <div className="border-b border-slate-200 px-7 py-6">
                <SectionTitle
                  title="Últimos bilhetes"
                  description="Bilhetes emitidos, válidos, usados ou cancelados."
                />
              </div>

              <div className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
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
                        {getSeatLabel(ticket)}
                      </div>

                      <div className="flex items-center gap-2">
                        {normalizeStatus(ticket.status || ticket.ticketStatus) === "USED" ? (
                          <CheckCircle2 size={17} className="text-green-600" />
                        ) : normalizeStatus(ticket.status || ticket.ticketStatus) === "CANCELLED" ? (
                          <XCircle size={17} className="text-red-600" />
                        ) : (
                          <AlertTriangle size={17} className="text-amber-600" />
                        )}
                        Emitido em {formatDateTime(ticket.issuedAt || ticket.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTickets.length === 0 && (
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