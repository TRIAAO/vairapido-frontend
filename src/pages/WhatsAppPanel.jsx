import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  TicketCheck,
  WalletCards,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  listWhatsAppMessages,
  markWhatsAppMessageFailed,
  markWhatsAppMessageSent,
  sendPaymentInstructions,
  sendTicketMessage
} from "../api/whatsapp";

const statusLabels = {
  PENDING: "Pendente",
  SENT: "Enviado",
  FAILED: "Falhou"
};

const typeLabels = {
  PAYMENT_INSTRUCTIONS: "Instruções de pagamento",
  TICKET_ISSUED: "Bilhete emitido",
  BOOKING_CANCELLED: "Reserva cancelada",
  BOOKING_EXPIRED: "Reserva expirada"
};

const statusOptions = ["PENDING", "SENT", "FAILED"];
const typeOptions = [
  "PAYMENT_INSTRUCTIONS",
  "TICKET_ISSUED",
  "BOOKING_CANCELLED",
  "BOOKING_EXPIRED"
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

function getMessageId(message) {
  return message.id || message.messageId || "";
}

function getMessageType(message) {
  return String(message.messageType || message.type || "").toUpperCase();
}

function getReferenceCode(message) {
  return message.referenceCode || message.bookingCode || message.ticketCode || "-";
}

function getPassengerName(message) {
  return message.passengerName || message.passengerFullName || "-";
}

function getToPhone(message) {
  return message.toPhone || message.phone || message.whatsapp || "-";
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
    PENDING: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40",
    SENT: "bg-green-50 text-green-700 ring-green-200",
    FAILED: "bg-red-50 text-red-700 ring-red-200"
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

function typePill(type) {
  const normalized = String(type || "").toUpperCase();

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">
      {typeLabels[normalized] || normalized || "-"}
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

export default function WhatsAppPanel() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [paymentBookingId, setPaymentBookingId] = useState("");
  const [ticketId, setTicketId] = useState("");

  const [loading, setLoading] = useState(true);
  const [sendingPayment, setSendingPayment] = useState(false);
  const [sendingTicket, setSendingTicket] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);

  const metrics = useMemo(() => {
    const pending = messages.filter(
      (item) => normalizeStatus(item.status) === "PENDING"
    );
    const sent = messages.filter((item) => normalizeStatus(item.status) === "SENT");
    const failed = messages.filter(
      (item) => normalizeStatus(item.status) === "FAILED"
    );

    const byType = messages.reduce((acc, item) => {
      const type = getMessageType(item) || "OUTRO";

      if (!acc[type]) {
        acc[type] = {
          type,
          count: 0
        };
      }

      acc[type].count += 1;
      return acc;
    }, {});

    return {
      total: messages.length,
      pending: pending.length,
      sent: sent.length,
      failed: failed.length,
      byType: Object.values(byType)
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const term = normalizeText(query);

    return messages.filter((item) => {
      const status = normalizeStatus(item.status);
      const type = getMessageType(item);

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesType = typeFilter === "ALL" || type === typeFilter;

      const matchesQuery =
        !term ||
        [
          item.id,
          item.bookingId,
          item.ticketId,
          getReferenceCode(item),
          getPassengerName(item),
          getToPhone(item),
          item.providerName,
          item.providerMessageId,
          item.errorMessage,
          item.messageBody,
          status,
          type,
          typeLabels[type]
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));

      return matchesStatus && matchesType && matchesQuery;
    });
  }, [messages, query, statusFilter, typeFilter]);

  async function loadMessages() {
    setLoading(true);
    setMessage(null);

    try {
      const data = await listWhatsAppMessages();
      setMessages(Array.isArray(data) ? data : []);
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
    loadMessages();
  }, []);

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  }

  async function handleSendPaymentInstructions(event) {
    event.preventDefault();

    if (!paymentBookingId.trim()) {
      return;
    }

    setSendingPayment(true);
    setMessage(null);

    try {
      await sendPaymentInstructions(paymentBookingId.trim());

      setMessage({
        type: "success",
        text: "Mensagem de instruções de pagamento criada/enviada com sucesso."
      });

      setPaymentBookingId("");
      await loadMessages();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSendingPayment(false);
    }
  }

  async function handleSendTicket(event) {
    event.preventDefault();

    if (!ticketId.trim()) {
      return;
    }

    setSendingTicket(true);
    setMessage(null);

    try {
      await sendTicketMessage(ticketId.trim());

      setMessage({
        type: "success",
        text: "Mensagem de bilhete criada/enviada com sucesso."
      });

      setTicketId("");
      await loadMessages();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSendingTicket(false);
    }
  }

  async function handleMarkSent(item) {
    const messageId = getMessageId(item);
    const confirmed = window.confirm("Marcar esta mensagem como enviada?");

    if (!confirmed) {
      return;
    }

    setChangingId(messageId);
    setMessage(null);

    try {
      await markWhatsAppMessageSent(messageId);

      setMessage({
        type: "success",
        text: "Mensagem marcada como enviada."
      });

      await loadMessages();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleMarkFailed(item) {
    const messageId = getMessageId(item);
    const confirmed = window.confirm("Marcar esta mensagem como falhou?");

    if (!confirmed) {
      return;
    }

    setChangingId(messageId);
    setMessage(null);

    try {
      await markWhatsAppMessageFailed(messageId);

      setMessage({
        type: "success",
        text: "Mensagem marcada como falhou."
      });

      await loadMessages();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
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
                <MessageCircle size={16} />
                Módulo 72
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Gestão real do WhatsApp
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Controle mensagens de pagamento, bilhete, cancelamento e expiração
                enviadas pelo fluxo do VaiRápido.
              </p>
            </div>

            <button
              type="button"
              onClick={loadMessages}
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
          Carregando mensagens...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Mensagens"
              value={metrics.total}
              description="Total carregado no painel."
              icon={MessageCircle}
              tone="navy"
            />

            <MetricCard
              title="Pendentes"
              value={metrics.pending}
              description="Aguardando envio/status."
              icon={Smartphone}
              tone="yellow"
            />

            <MetricCard
              title="Enviadas"
              value={metrics.sent}
              description="Confirmadas como enviadas."
              icon={CheckCircle2}
              tone="green"
            />

            <MetricCard
              title="Falhas"
              value={metrics.failed}
              description="Precisam de atenção."
              icon={XCircle}
              tone="red"
            />
          </section>

          {metrics.byType.length > 0 && (
            <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.byType.map((item) => (
                <article
                  key={item.type}
                  className="rounded-3xl border border-blue-100 bg-blue-50 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    Tipo de mensagem
                  </p>
                  <h3 className="mt-2 text-xl font-black text-navy">
                    {item.count}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-blue-800">
                    {typeLabels[item.type] || item.type}
                  </p>
                </article>
              ))}
            </section>
          )}

          <section className="grid min-w-0 gap-5 xl:grid-cols-2">
            <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="mb-5 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-yellowBrand text-navy">
                  <WalletCards size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-navy">
                    Enviar instruções de pagamento
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Use o ID da reserva para gerar a mensagem de pagamento.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendPaymentInstructions} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">ID da reserva</span>
                  <input
                    value={paymentBookingId}
                    onChange={(event) => setPaymentBookingId(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="UUID da reserva"
                  />
                </label>

                <button
                  type="submit"
                  disabled={sendingPayment || !paymentBookingId.trim()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sendingPayment ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  Enviar pagamento
                </button>
              </form>
            </article>

            <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="mb-5 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy text-white">
                  <TicketCheck size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-navy">
                    Enviar bilhete ao passageiro
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Use o ID do bilhete para gerar a mensagem com o bilhete.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendTicket} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">ID do bilhete</span>
                  <input
                    value={ticketId}
                    onChange={(event) => setTicketId(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="UUID do bilhete"
                  />
                </label>

                <button
                  type="submit"
                  disabled={sendingTicket || !ticketId.trim()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sendingTicket ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  Enviar bilhete
                </button>
              </form>
            </article>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                  <Search size={15} />
                  Filtros
                </div>

                <h2 className="text-2xl font-black text-navy">Controle das mensagens</h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Filtros por status, tipo, telefone, passageiro ou código de referência.
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
                    placeholder="Telefone, passageiro, código, mensagem..."
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
                <span className="text-sm font-black text-navy">Tipo</span>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todos</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type] || type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-black text-navy">Mensagens encontradas</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {filteredMessages.length} mensagem(ns) no filtro atual.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Mensagem
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Passageiro
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Referência
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Conteúdo
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Provedor
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMessages.map((item) => {
                    const messageId = getMessageId(item);
                    const status = normalizeStatus(item.status);
                    const loadingAction = changingId === messageId;
                    const canMarkSent = status !== "SENT";
                    const canMarkFailed = status !== "FAILED";

                    return (
                      <tr
                        key={messageId}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-2">
                            <p className="break-all text-sm font-black text-navy">
                              {messageId}
                            </p>
                            {typePill(getMessageType(item))}
                            <p className="text-xs font-bold text-slate-500">
                              Criada: {formatDateTime(item.createdAt)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Atualizada: {formatDateTime(item.updatedAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="max-w-[180px] truncate text-sm font-black text-navy">
                              {getPassengerName(item)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Para: {getToPhone(item)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="break-all text-sm font-black text-navy">
                              {getReferenceCode(item)}
                            </p>
                            <p className="break-all text-xs font-bold text-slate-500">
                              Reserva: {valueOrDash(item.bookingId)}
                            </p>
                            <p className="break-all text-xs font-bold text-slate-500">
                              Bilhete: {valueOrDash(item.ticketId)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-2">
                            {statusPill(status)}
                            <p className="text-xs font-bold text-slate-500">
                              Enviado: {formatDateTime(item.sentAt)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Falhou: {formatDateTime(item.failedAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-2">
                            <p className="line-clamp-4 max-w-[260px] text-xs font-bold leading-5 text-slate-600">
                              {valueOrDash(item.messageBody)}
                            </p>

                            {item.errorMessage && (
                              <p className="max-w-[260px] text-xs font-black leading-5 text-red-600">
                                Erro: {item.errorMessage}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="text-sm font-black text-navy">
                              {valueOrDash(item.providerName)}
                            </p>
                            <p className="break-all text-xs font-bold text-slate-500">
                              {valueOrDash(item.providerMessageId)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="flex min-w-[250px] flex-wrap gap-2">
                            <ActionButton
                              tone="green"
                              disabled={!canMarkSent || loadingAction}
                              onClick={() => handleMarkSent(item)}
                            >
                              {loadingAction ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              Enviado
                            </ActionButton>

                            <ActionButton
                              tone="red"
                              disabled={!canMarkFailed || loadingAction}
                              onClick={() => handleMarkFailed(item)}
                            >
                              <XCircle size={14} />
                              Falhou
                            </ActionButton>

                            <ActionButton
                              tone="yellow"
                              disabled={!item.messageBody}
                              onClick={() =>
                                handleCopy(item.messageBody, "Mensagem copiada.")
                              }
                            >
                              <ClipboardCopy size={14} />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredMessages.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm font-black text-slate-500"
                      >
                        Nenhuma mensagem encontrada.
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
                <AlertTriangle size={24} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-black text-blue-900">
                  Módulo 72 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  A tela usa o WhatsApp simulado/registrado pelo backend. Quando
                  integrar WhatsApp Cloud API real, esta tela já serve como centro
                  de monitoramento das mensagens.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
