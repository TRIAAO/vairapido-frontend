import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Armchair,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  TicketCheck,
  UserCheck,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  boardTicketByCode,
  cancelTicket,
  listTickets,
  previewBoarding,
  useTicket
} from "../api/tickets";

const statusLabels = {
  VALID: "Válido",
  USED: "Usado",
  CANCELLED: "Cancelado",
  CANCELED: "Cancelado"
};

const statusOptions = ["VALID", "USED", "CANCELLED"];

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

function getTicketId(ticket) {
  return ticket.id || ticket.ticketId || "";
}

function getTicketCode(ticket) {
  return ticket.ticketCode || ticket.code || ticket.id || "-";
}

function getBookingCode(ticket) {
  return ticket.bookingCode || ticket.booking?.bookingCode || ticket.bookingId || "-";
}

function getPassengerName(ticket) {
  return (
    ticket.passengerName ||
    ticket.passengerFullName ||
    ticket.passenger?.fullName ||
    ticket.passenger?.name ||
    "-"
  );
}

function getPassengerDocument(ticket) {
  return (
    ticket.passengerDocument ||
    ticket.passenger?.document ||
    ticket.passenger?.documentNumber ||
    "-"
  );
}

function getPassengerWhatsapp(ticket) {
  return (
    ticket.passengerWhatsapp ||
    ticket.passengerPhone ||
    ticket.passenger?.whatsapp ||
    ticket.passenger?.phone ||
    "-"
  );
}

function getCompanyName(ticket) {
  return (
    ticket.companyTradeName ||
    ticket.companyName ||
    ticket.transportCompanyTradeName ||
    ticket.transportCompanyName ||
    ticket.booking?.companyTradeName ||
    ticket.booking?.companyName ||
    "Sem empresa"
  );
}

function getRouteLabel(ticket) {
  const origin =
    ticket.originCity ||
    ticket.originLabel ||
    ticket.route?.originCity ||
    ticket.trip?.originCity ||
    "-";

  const destination =
    ticket.destinationCity ||
    ticket.destinationLabel ||
    ticket.route?.destinationCity ||
    ticket.trip?.destinationCity ||
    "-";

  return `${origin} → ${destination}`;
}

function getRouteFullLabel(ticket) {
  const originCity =
    ticket.originCity ||
    ticket.originLabel ||
    ticket.route?.originCity ||
    ticket.trip?.originCity ||
    "-";

  const originState = ticket.originState ? `/${ticket.originState}` : "";
  const originTerminal = ticket.originTerminal ? ` · ${ticket.originTerminal}` : "";

  const destinationCity =
    ticket.destinationCity ||
    ticket.destinationLabel ||
    ticket.route?.destinationCity ||
    ticket.trip?.destinationCity ||
    "-";

  const destinationState = ticket.destinationState ? `/${ticket.destinationState}` : "";
  const destinationTerminal = ticket.destinationTerminal
    ? ` · ${ticket.destinationTerminal}`
    : "";

  return `${originCity}${originState}${originTerminal} → ${destinationCity}${destinationState}${destinationTerminal}`;
}

function getAmount(ticket) {
  return ticket.amount || ticket.totalAmount || ticket.price || ticket.paidAmount || 0;
}

function getCurrency(ticket) {
  return String(ticket.currency || ticket.booking?.currency || "BRL").toUpperCase();
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

async function copyToClipboard(value) {
  if (!value) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function statusPill(status) {
  const normalized = normalizeStatus(status);

  const styles = {
    VALID: "bg-green-50 text-green-700 ring-green-200",
    USED: "bg-amber-50 text-amber-700 ring-amber-200",
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
    red: "bg-red-50 text-red-700 ring-1 ring-red-200 disabled:bg-slate-100 disabled:text-slate-400",
    slate: "bg-slate-100 text-navy disabled:bg-slate-100 disabled:text-slate-400"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black transition disabled:cursor-not-allowed",
        tones[tone]
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function TicketsPanel() {
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");

  const [boardingCode, setBoardingCode] = useState("");
  const [boardingPreview, setBoardingPreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState(null);
  const [boardingLoading, setBoardingLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const currencyOptions = useMemo(() => {
    const currencies = tickets.map((ticket) => getCurrency(ticket)).filter(Boolean);
    return Array.from(new Set(currencies)).sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  const metrics = useMemo(() => {
    const valid = tickets.filter((ticket) => normalizeStatus(ticket.status) === "VALID");
    const used = tickets.filter((ticket) => normalizeStatus(ticket.status) === "USED");
    const cancelled = tickets.filter((ticket) =>
      ["CANCELLED", "CANCELED"].includes(normalizeStatus(ticket.status))
    );

    const byCurrency = tickets.reduce((acc, ticket) => {
      const currency = getCurrency(ticket);
      const amount = Number(getAmount(ticket));
      const status = normalizeStatus(ticket.status);

      if (!acc[currency]) {
        acc[currency] = {
          currency,
          country: getCountryByCurrency(currency),
          total: 0,
          count: 0
        };
      }

      if (!["CANCELLED", "CANCELED"].includes(status)) {
        acc[currency].total += Number.isNaN(amount) ? 0 : amount;
      }

      acc[currency].count += 1;
      return acc;
    }, {});

    return {
      total: tickets.length,
      valid: valid.length,
      used: used.length,
      cancelled: cancelled.length,
      byCurrency: Object.values(byCurrency)
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const term = normalizeText(query);

    return tickets.filter((ticket) => {
      const status = normalizeStatus(ticket.status);
      const currency = getCurrency(ticket);

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesCurrency =
        currencyFilter === "ALL" || currency === currencyFilter;

      const matchesQuery =
        !term ||
        [
          getTicketCode(ticket),
          getBookingCode(ticket),
          getPassengerName(ticket),
          getPassengerDocument(ticket),
          getPassengerWhatsapp(ticket),
          getCompanyName(ticket),
          getRouteLabel(ticket),
          status,
          currency,
          getCountryByCurrency(currency)
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));

      return matchesStatus && matchesCurrency && matchesQuery;
    });
  }, [currencyFilter, query, statusFilter, tickets]);

  async function loadTickets() {
    setLoading(true);
    setMessage(null);

    try {
      const data = await listTickets();
      setTickets(Array.isArray(data) ? data : []);
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
    loadTickets();
  }, []);

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setCurrencyFilter("ALL");
  }

  async function handleUseTicket(ticket) {
    const ticketId = getTicketId(ticket);
    const confirmed = window.confirm(`Marcar o bilhete ${getTicketCode(ticket)} como usado?`);

    if (!confirmed) {
      return;
    }

    setChangingId(ticketId);
    setMessage(null);

    try {
      await useTicket(ticketId);

      setMessage({
        type: "success",
        text: "Bilhete marcado como usado."
      });

      await loadTickets();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleCancel(ticket) {
    const ticketId = getTicketId(ticket);
    const confirmed = window.confirm(`Cancelar o bilhete ${getTicketCode(ticket)}?`);

    if (!confirmed) {
      return;
    }

    setChangingId(ticketId);
    setMessage(null);

    try {
      await cancelTicket(ticketId);

      setMessage({
        type: "success",
        text: "Bilhete cancelado com sucesso."
      });

      await loadTickets();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handlePreviewBoarding(event) {
    event.preventDefault();

    if (!boardingCode.trim()) {
      return;
    }

    setBoardingLoading(true);
    setMessage(null);
    setBoardingPreview(null);

    try {
      const preview = await previewBoarding(boardingCode.trim());
      setBoardingPreview(preview);
      setMessage({
        type: "success",
        text: "Pré-embarque consultado com sucesso."
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setBoardingLoading(false);
    }
  }

  async function handleBoardByCode() {
    if (!boardingCode.trim()) {
      return;
    }

    const confirmed = window.confirm(`Confirmar embarque do bilhete ${boardingCode.trim()}?`);

    if (!confirmed) {
      return;
    }

    setBoardingLoading(true);
    setMessage(null);

    try {
      await boardTicketByCode(boardingCode.trim());

      setMessage({
        type: "success",
        text: "Embarque confirmado com sucesso."
      });

      setBoardingPreview(null);
      setBoardingCode("");
      await loadTickets();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setBoardingLoading(false);
    }
  }

  async function handleCopy(value, successText) {
    const copied = await copyToClipboard(value);

    setMessage({
      type: copied ? "success" : "error",
      text: copied ? successText : "Não foi possível copiar."
    });
  }

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <TicketCheck size={16} />
                Módulo 70
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Gestão real de bilhetes
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Controle bilhetes emitidos, QR Code, validação pública, uso,
                cancelamento e embarque por código.
              </p>
            </div>

            <button
              type="button"
              onClick={loadTickets}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
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

      {loading ? (
        <section className="flex min-h-56 items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-10 text-sm font-black text-slate-500 shadow-soft">
          <Loader2 className="animate-spin" size={22} />
          Carregando bilhetes...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Bilhetes"
              value={metrics.total}
              description="Total carregado no painel."
              icon={TicketCheck}
              tone="navy"
            />

            <MetricCard
              title="Válidos"
              value={metrics.valid}
              description="Prontos para embarque."
              icon={ShieldCheck}
              tone="green"
            />

            <MetricCard
              title="Usados"
              value={metrics.used}
              description="Já embarcaram."
              icon={UserCheck}
              tone="yellow"
            />

            <MetricCard
              title="Cancelados"
              value={metrics.cancelled}
              description="Bilhetes bloqueados."
              icon={XCircle}
              tone="red"
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
                    {item.count} bilhetes nesta moeda. Não misturar moedas.
                  </p>
                </article>
              ))}
            </section>
          )}

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                  <QrCode size={15} />
                  Embarque rápido
                </div>

                <h2 className="text-2xl font-black text-navy">Validar bilhete por código</h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Consulte o pré-embarque e confirme o uso pelo código do bilhete.
                </p>
              </div>
            </div>

            <form
              onSubmit={handlePreviewBoarding}
              className="grid min-w-0 gap-4 lg:grid-cols-[1fr_auto_auto]"
            >
              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Código do bilhete</span>

                <input
                  value={boardingCode}
                  onChange={(event) => setBoardingCode(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="Ex.: VR-..."
                />
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={boardingLoading || !boardingCode.trim()}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 text-sm font-black text-navy disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {boardingLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  Prévia
                </button>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleBoardByCode}
                  disabled={boardingLoading || !boardingCode.trim()}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <CheckCircle2 size={18} />
                  Embarcar
                </button>
              </div>
            </form>

            {boardingPreview && (
              <div className="mt-5 rounded-3xl border border-green-200 bg-green-50 p-5">
                <p className="text-sm font-black text-green-800">
                  Pré-embarque encontrado
                </p>
                <div className="mt-3 grid gap-3 text-sm font-bold text-green-900 md:grid-cols-2 lg:grid-cols-4">
                  <span>Bilhete: {valueOrDash(boardingPreview.ticketCode || boardingCode)}</span>
                  <span>Passageiro: {valueOrDash(boardingPreview.passengerName)}</span>
                  <span>Status: {valueOrDash(boardingPreview.status)}</span>
                  <span>Assento: {valueOrDash(boardingPreview.seatNumber)}</span>
                </div>
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                  <Search size={15} />
                  Filtros
                </div>

                <h2 className="text-2xl font-black text-navy">Controle dos bilhetes</h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Filtros por status e país/moeda para leitura limpa em 100% de zoom.
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
                    placeholder="Bilhete, reserva, passageiro, rota..."
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
              <h2 className="text-2xl font-black text-navy">Bilhetes encontrados</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {filteredTickets.length} bilhete(s) no filtro atual.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Bilhete
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Passageiro
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Viagem
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Valor
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Links
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTickets.map((ticket) => {
                    const ticketId = getTicketId(ticket);
                    const status = normalizeStatus(ticket.status);
                    const currency = getCurrency(ticket);
                    const loadingAction = changingId === ticketId;
                    const canUse = status === "VALID";
                    const canCancel = status === "VALID";

                    return (
                      <tr
                        key={ticketId || getTicketCode(ticket)}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="break-all text-sm font-black text-navy">
                              {getTicketCode(ticket)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Reserva: {getBookingCode(ticket)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Emitido: {formatDateTime(ticket.issuedAt)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Usado: {formatDateTime(ticket.usedAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="text-sm font-black text-navy">
                              {getPassengerName(ticket)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Doc: {getPassengerDocument(ticket)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              WhatsApp: {getPassengerWhatsapp(ticket)}
                            </p>
                            {ticket.minorGuardianName && (
                              <p className="text-xs font-bold text-amber-700">
                                Menor: {ticket.minorGuardianName}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="max-w-[240px] text-sm font-black text-navy">
                              {getRouteLabel(ticket)}
                            </p>
                            <p className="max-w-[240px] text-xs font-bold leading-5 text-slate-500">
                              {getRouteFullLabel(ticket)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Empresa: {getCompanyName(ticket)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Saída: {formatDateTime(ticket.departureAt)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Assento: {valueOrDash(ticket.seatNumber)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <p className="text-sm font-black text-navy">
                            {formatMoney(getAmount(ticket), currency)}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {getCountryByCurrency(currency)} · {currency}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {ticket.passengerFareType || "Tarifa padrão"}
                          </p>
                        </td>

                        <td className="px-5 py-5 align-top">
                          {statusPill(status)}
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="flex min-w-[210px] flex-wrap gap-2">
                            {ticket.qrCodeUrl && (
                              <a
                                href={ticket.qrCodeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 text-xs font-black text-blue-700 ring-1 ring-blue-200"
                              >
                                <QrCode size={14} />
                                QR
                              </a>
                            )}

                            {ticket.validationUrl && (
                              <a
                                href={ticket.validationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-xs font-black text-navy"
                              >
                                <ExternalLink size={14} />
                                Validar
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(getTicketCode(ticket), "Código do bilhete copiado.")
                              }
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-4 text-xs font-black text-navy"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="flex min-w-[220px] flex-wrap gap-2">
                            <ActionButton
                              tone="green"
                              disabled={!canUse || loadingAction}
                              onClick={() => handleUseTicket(ticket)}
                            >
                              {loadingAction ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                "Usar"
                              )}
                            </ActionButton>

                            <ActionButton
                              tone="red"
                              disabled={!canCancel || loadingAction}
                              onClick={() => handleCancel(ticket)}
                            >
                              Cancelar
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTickets.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm font-black text-slate-500"
                      >
                        Nenhum bilhete encontrado.
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
                  Módulo 70 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  A tela controla bilhetes, QR Code, validação pública e embarque
                  mantendo separação por país/moeda.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
