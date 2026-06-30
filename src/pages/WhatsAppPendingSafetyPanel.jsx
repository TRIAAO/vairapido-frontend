import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  getWhatsAppCloudStatus,
  listWhatsAppMessages,
  sendPendingRealWhatsAppMessages,
  sendRealWhatsAppMessage
} from "../api/whatsapp";

const CONFIRM_TEXT = "ENVIAR_WHATSAPP_REAL";

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
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

function copyToClipboard(value) {
  if (!value) {
    return;
  }

  navigator.clipboard?.writeText(value);
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

function MessageCard({ item, onSendOne, sendingId }) {
  const isSending = sendingId === item.id;

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-yellowBrand/20 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-yellowBrand/40">
              {item.status}
            </span>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">
              {item.messageType || "Mensagem"}
            </span>
          </div>

          <h3 className="break-all text-lg font-black text-navy">{item.referenceCode || item.id}</h3>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {item.passengerName || "-"} · {item.toPhone || "-"}
          </p>

          <p className="mt-2 line-clamp-3 max-w-3xl text-sm font-bold leading-6 text-slate-500">
            {item.messageBody || "-"}
          </p>

          <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-2">
            <span className="break-all">ID: {item.id}</span>
            <span>Criada: {formatDateTime(item.createdAt)}</span>
            <span>Reserva: {item.bookingId || "-"}</span>
            <span>Bilhete: {item.ticketId || "-"}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
          <button
            type="button"
            onClick={() => copyToClipboard(item.id)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-navy"
          >
            <ClipboardCopy size={16} />
            Copiar ID
          </button>

          <button
            type="button"
            disabled={isSending}
            onClick={() => onSendOne(item)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-4 text-sm font-black text-navy disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Enviar 1 real
          </button>
        </div>
      </div>
    </article>
  );
}

export default function WhatsAppPendingSafetyPanel() {
  const [cloudStatus, setCloudStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [limit, setLimit] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [bulkResult, setBulkResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [message, setMessage] = useState(null);

  const cloudConfigured = Boolean(cloudStatus?.configured);

  const pendingMessages = useMemo(
    () => messages.filter((item) => normalizeStatus(item.status) === "PENDING"),
    [messages]
  );

  const filteredMessages = useMemo(() => {
    const term = normalizeText(query);
    const phone = normalizePhone(phoneFilter);

    return pendingMessages.filter((item) => {
      const matchesPhone = !phone || normalizePhone(item.toPhone).includes(phone);
      const matchesQuery =
        !term ||
        [
          item.id,
          item.referenceCode,
          item.passengerName,
          item.toPhone,
          item.messageType,
          item.messageBody,
          item.bookingId,
          item.ticketId
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));

      return matchesPhone && matchesQuery;
    });
  }, [pendingMessages, phoneFilter, query]);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    try {
      const [statusData, messagesData] = await Promise.all([
        getWhatsAppCloudStatus(),
        listWhatsAppMessages()
      ]);

      setCloudStatus(statusData);
      setMessages(Array.isArray(messagesData) ? messagesData : []);
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
    loadData();
  }, []);

  async function handleSendOne(item) {
    const confirmed = window.confirm(
      `Enviar mensagem real para ${item.passengerName || item.toPhone || "passageiro"}?`
    );

    if (!confirmed) {
      return;
    }

    setSendingId(item.id);
    setMessage(null);

    try {
      await sendRealWhatsAppMessage(item.id);

      setMessage({
        type: "success",
        text: "Mensagem enviada/processada com sucesso."
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSendingId(null);
    }
  }

  async function handleBulkSubmit(event) {
    event.preventDefault();

    setBulkSending(true);
    setMessage(null);
    setBulkResult(null);

    try {
      const result = await sendPendingRealWhatsAppMessages({
        confirmText,
        dryRun,
        onlyToPhone: phoneFilter.trim() || null,
        limit: Number(limit) || 1
      });

      setBulkResult(result);

      setMessage({
        type: "success",
        text: result.message || "Processamento concluído."
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setBulkSending(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <ShieldAlert size={16} />
                Módulo 78
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Pendências WhatsApp com segurança
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Controle mensagens pendentes antes do envio real. Simule, filtre por telefone e limite o lote para evitar disparos acidentais.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
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
          Carregando pendências WhatsApp...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Cloud API"
              value={cloudConfigured ? "Pronta" : "Pendente"}
              description={cloudStatus?.message || "Status indisponível."}
              icon={cloudConfigured ? CheckCircle2 : AlertTriangle}
              tone={cloudConfigured ? "green" : "yellow"}
            />

            <MetricCard
              title="Pendentes"
              value={pendingMessages.length}
              description="Mensagens aguardando envio/status."
              icon={Smartphone}
              tone="navy"
            />

            <MetricCard
              title="No filtro atual"
              value={filteredMessages.length}
              description="Resultado com busca e telefone."
              icon={Filter}
              tone="blue"
            />

            <MetricCard
              title="Limite seguro"
              value="10"
              description="Máximo por execução no backend."
              icon={ShieldCheck}
              tone="red"
            />
          </section>

          <section className="grid min-w-0 gap-5 xl:grid-cols-[1fr_0.9fr]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                  <Search size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-navy">Filtros de segurança</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Antes de enviar, filtre por telefone ou referência. Para teste, use um número controlado.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">Buscar</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Nome, referência, ID..."
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">Filtrar telefone</span>
                  <input
                    value={phoneFilter}
                    onChange={(event) => setPhoneFilter(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Ex.: +5511915102566"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-[2rem] border border-red-200 bg-red-50 p-6 shadow-sm">
              <div className="mb-5 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700">
                  <XCircle size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-red-900">Proteção contra disparo</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-red-800">
                    O backend exige confirmação textual e limita lote real a 10 mensagens.
                  </p>
                </div>
              </div>

              <form onSubmit={handleBulkSubmit} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-red-900">Confirmação obrigatória</span>
                  <input
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-red-200 px-4 text-sm font-bold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    placeholder={CONFIRM_TEXT}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-red-900">Limite por execução</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-red-200 px-4 text-sm font-bold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-red-900">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(event) => setDryRun(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Simular primeiro, sem enviar
                </label>

                <button
                  type="submit"
                  disabled={!cloudConfigured || bulkSending || confirmText !== CONFIRM_TEXT}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {bulkSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  {dryRun ? "Simular lote" : "Enviar lote real"}
                </button>
              </form>
            </article>
          </section>

          {bulkResult && (
            <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
              <h2 className="text-2xl font-black text-blue-900">Resultado do processamento</h2>
              <div className="mt-4 grid gap-3 text-sm font-bold text-blue-800 md:grid-cols-3">
                <span>Dry run: {bulkResult.dryRun ? "Sim" : "Não"}</span>
                <span>Elegíveis: {bulkResult.eligible}</span>
                <span>Enviadas: {bulkResult.sent}</span>
                <span>Falhas: {bulkResult.failed}</span>
                <span>Ignoradas: {bulkResult.skipped}</span>
                <span>Limite: {bulkResult.limitApplied}</span>
              </div>
              <p className="mt-4 text-sm font-black text-blue-900">{bulkResult.message}</p>
            </section>
          )}

          <section className="grid min-w-0 gap-5">
            {filteredMessages.slice(0, 80).map((item) => (
              <MessageCard
                key={item.id}
                item={item}
                onSendOne={handleSendOne}
                sendingId={sendingId}
              />
            ))}

            {filteredMessages.length === 0 && (
              <section className="rounded-[2rem] border border-green-200 bg-green-50 p-8 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-green-100 text-green-700">
                  <ShieldCheck size={28} />
                </div>
                <h2 className="text-2xl font-black text-green-900">Nenhuma pendência no filtro</h2>
                <p className="mt-2 text-sm font-semibold text-green-800">
                  Não há mensagens pendentes dentro do filtro atual.
                </p>
              </section>
            )}
          </section>

          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                <ShieldCheck size={24} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-black text-blue-900">Módulo 78 aplicado</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  A operação agora tem uma camada de proteção para envio real: filtro por telefone, simulação, confirmação textual e limite no backend.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
