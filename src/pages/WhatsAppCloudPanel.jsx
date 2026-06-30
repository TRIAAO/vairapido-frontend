import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Settings,
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

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
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

function StatusPill({ ok, children }) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
        ok
          ? "bg-green-50 text-green-700 ring-green-200"
          : "bg-red-50 text-red-700 ring-red-200"
      ].join(" ")}
    >
      {children}
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

export default function WhatsAppCloudPanel() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageId, setMessageId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingOne, setSendingOne] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [message, setMessage] = useState(null);

  const pendingMessages = useMemo(
    () => messages.filter((item) => normalizeStatus(item.status) === "PENDING"),
    [messages]
  );

  const failedMessages = useMemo(
    () => messages.filter((item) => normalizeStatus(item.status) === "FAILED"),
    [messages]
  );

  const cloudMessages = useMemo(
    () =>
      messages.filter((item) =>
        String(item.providerName || "").toUpperCase().includes("CLOUD")
      ),
    [messages]
  );

  async function loadData() {
    setLoading(true);
    setMessage(null);

    try {
      const [cloudStatus, whatsappMessages] = await Promise.all([
        getWhatsAppCloudStatus(),
        listWhatsAppMessages()
      ]);

      setStatus(cloudStatus);
      setMessages(Array.isArray(whatsappMessages) ? whatsappMessages : []);
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

  async function handleSendOne(event) {
    event.preventDefault();

    if (!messageId.trim()) {
      return;
    }

    setSendingOne(true);
    setMessage(null);

    try {
      await sendRealWhatsAppMessage(messageId.trim());

      setMessage({
        type: "success",
        text: "Mensagem enviada pela integração real ou processada pelo backend."
      });

      setMessageId("");
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSendingOne(false);
    }
  }

  async function handleSendAllPending() {
    const confirmed = window.confirm(
      `Enviar ${pendingMessages.length} mensagem(ns) pendente(s) pela WhatsApp Cloud API real?`
    );

    if (!confirmed) {
      return;
    }

    setSendingAll(true);
    setMessage(null);

    try {
      const result = await sendPendingRealWhatsAppMessages();

      setMessage({
        type: "success",
        text: `${result.length} mensagem(ns) processada(s) para envio real.`
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSendingAll(false);
    }
  }

  const configured = Boolean(status?.configured);
  const enabled = Boolean(status?.enabled);

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <Cloud size={16} />
                Módulo 76
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                WhatsApp Cloud API real
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Preparação segura para envio real via Meta/WhatsApp Cloud API,
                mantendo o modo simulado quando as credenciais não estiverem ativas.
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
          Carregando integração WhatsApp Cloud...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Cloud API"
              value={configured ? "Pronta" : "Pendente"}
              description={status?.message || "Status não informado."}
              icon={configured ? CheckCircle2 : AlertTriangle}
              tone={configured ? "green" : "yellow"}
            />

            <MetricCard
              title="Mensagens pendentes"
              value={pendingMessages.length}
              description="Aguardando envio/status."
              icon={MessageCircle}
              tone="navy"
            />

            <MetricCard
              title="Mensagens Cloud"
              value={cloudMessages.length}
              description="Processadas pelo provedor real."
              icon={Cloud}
              tone="blue"
            />

            <MetricCard
              title="Falhas"
              value={failedMessages.length}
              description="Precisam de revisão."
              icon={XCircle}
              tone="red"
            />
          </section>

          <section className="grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="mb-5 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                  <Settings size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-navy">
                    Status da configuração
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    O token nunca aparece no painel. Apenas mostramos se está configurado.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-black text-navy">Envio real ativado</span>
                  <StatusPill ok={enabled}>{enabled ? "Sim" : "Não"}</StatusPill>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-black text-navy">Access token</span>
                  <StatusPill ok={status?.accessTokenConfigured}>
                    {status?.accessTokenConfigured ? "Configurado" : "Pendente"}
                  </StatusPill>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-black text-navy">Phone number ID</span>
                  <StatusPill ok={status?.phoneNumberIdConfigured}>
                    {status?.phoneNumberIdConfigured ? "Configurado" : "Pendente"}
                  </StatusPill>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Provider
                  </p>
                  <p className="mt-1 text-sm font-black text-navy">
                    {status?.providerName || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Endpoint
                  </p>
                  <p className="mt-1 break-all text-sm font-black text-navy">
                    {status?.baseUrl || "-"} / {status?.graphApiVersion || "-"}
                  </p>
                </div>
              </div>
            </article>

            <article className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="mb-5 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-yellowBrand text-navy">
                  <Send size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-navy">
                    Envio real controlado
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Primeiro gere mensagens na tela WhatsApp. Depois envie uma por ID
                    ou processe todas as pendentes.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendOne} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">ID da mensagem WhatsApp</span>

                  <input
                    value={messageId}
                    onChange={(event) => setMessageId(event.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="UUID da mensagem"
                  />
                </label>

                <button
                  type="submit"
                  disabled={!configured || sendingOne || !messageId.trim()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sendingOne ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  Enviar mensagem real
                </button>
              </form>

              <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="text-lg font-black text-blue-900">
                  Processar pendentes
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-blue-800">
                  Esta ação envia todas as mensagens com status PENDING usando a
                  integração real, caso esteja configurada.
                </p>

                <button
                  type="button"
                  disabled={!configured || sendingAll || pendingMessages.length === 0}
                  onClick={handleSendAllPending}
                  className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sendingAll ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  Enviar {pendingMessages.length} pendente(s)
                </button>
              </div>
            </article>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-navy">
                <Smartphone size={22} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h2 className="text-2xl font-black text-navy">
                  Variáveis de ambiente necessárias
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Configure no container do backend. Não coloque token no frontend.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                "VAIRAPIDO_WHATSAPP_CLOUD_ENABLED=true",
                "VAIRAPIDO_WHATSAPP_CLOUD_ACCESS_TOKEN=seu_token_da_meta",
                "VAIRAPIDO_WHATSAPP_CLOUD_PHONE_NUMBER_ID=seu_phone_number_id",
                "VAIRAPIDO_WHATSAPP_CLOUD_GRAPH_API_VERSION=v20.0",
                "VAIRAPIDO_WHATSAPP_CLOUD_BASE_URL=https://graph.facebook.com"
              ].map((line) => (
                <div
                  key={line}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <code className="min-w-0 break-all text-sm font-black text-navy">
                    {line}
                  </code>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(line)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-yellowBrand text-navy"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                <ShieldCheck size={24} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-black text-blue-900">
                  Módulo 76 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  O sistema continua seguro no modo simulado. O envio real só é
                  liberado quando todas as variáveis da WhatsApp Cloud API estiverem configuradas.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
