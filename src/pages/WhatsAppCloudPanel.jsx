import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import { getWhatsAppCloudStatus, listWhatsAppMessages } from "../api/whatsapp";

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
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
  const [loading, setLoading] = useState(true);
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
                Status seguro da integração real via Meta/WhatsApp Cloud API.
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
            message.type === "error" ? "bg-red-50 text-red-700" : ""
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
              description="Gerenciadas no módulo 78."
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
              <h2 className="text-2xl font-black text-navy">Status da configuração</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                O token nunca aparece no painel. Apenas mostramos se está configurado.
              </p>

              <div className="mt-5 grid gap-4">
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
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Provider</p>
                  <p className="mt-1 text-sm font-black text-navy">{status?.providerName || "-"}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Endpoint</p>
                  <p className="mt-1 break-all text-sm font-black text-navy">
                    {status?.baseUrl || "-"} / {status?.graphApiVersion || "-"}
                  </p>
                </div>
              </div>
            </article>

            <article className="min-w-0 rounded-[2rem] border border-blue-200 bg-blue-50 p-6 shadow-soft">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                <ShieldCheck size={22} strokeWidth={2.8} />
              </div>

              <h2 className="text-2xl font-black text-blue-900">Envio real protegido</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-blue-800">
                O envio em lote foi movido para uma tela segura com simulação, filtro por telefone, confirmação textual e limite no backend.
              </p>

              <Link
                to="/whatsapp-pendencias"
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy"
              >
                <Smartphone size={18} />
                Gerenciar pendências
              </Link>
            </article>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-navy">
                <Smartphone size={22} strokeWidth={2.8} />
              </div>

              <div className="min-w-0">
                <h2 className="text-2xl font-black text-navy">Variáveis de ambiente em uso</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Configure no container do backend. Não coloque token no frontend.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                "VAIRAPIDO_WHATSAPP_ENABLED=true",
                "VAIRAPIDO_WHATSAPP_ACCESS_TOKEN=seu_token_da_meta",
                "VAIRAPIDO_WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id",
                "VAIRAPIDO_WHATSAPP_GRAPH_API_VERSION=v25.0",
                "VAIRAPIDO_WHATSAPP_GRAPH_API_BASE_URL=https://graph.facebook.com"
              ].map((line) => (
                <div key={line} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <code className="min-w-0 break-all text-sm font-black text-navy">{line}</code>
                  <button type="button" onClick={() => copyToClipboard(line)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-yellowBrand text-navy">
                    <Copy size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
