import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  UserRound,
  XCircle
} from "lucide-react";
import { extractApiError, getBoardingPreview, markBoarding } from "../api/client";

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

function normalizeTicketCode(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function statusClasses(ticket) {
  if (!ticket) {
    return {
      wrapper: "border-slate-200 bg-white",
      iconBox: "bg-slate-100 text-slate-600",
      icon: FileSearch
    };
  }

  if (ticket.boarded || ticket.ticketStatus === "USED") {
    return {
      wrapper: "border-amber-200 bg-amber-50",
      iconBox: "bg-amber-100 text-amber-700",
      icon: AlertTriangle
    };
  }

  if (ticket.canBoard) {
    return {
      wrapper: "border-green-200 bg-green-50",
      iconBox: "bg-green-100 text-green-700",
      icon: CheckCircle2
    };
  }

  return {
    wrapper: "border-red-200 bg-red-50",
    iconBox: "bg-red-100 text-red-700",
    icon: XCircle
  };
}

function InfoItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-base font-black text-slate-900">
        {valueOrDash(value)}
      </dd>
    </div>
  );
}

function InfoBox({ title, icon: Icon, children }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-navy/10 text-navy">
          <Icon size={24} strokeWidth={2.8} />
        </div>

        <h3 className="text-xl font-black text-navy">{title}</h3>
      </div>

      <dl className="grid gap-5">{children}</dl>
    </article>
  );
}

export default function FiscalPanel() {
  const [ticketCode, setTicketCode] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [message, setMessage] = useState(null);

  const status = useMemo(() => statusClasses(ticket), [ticket]);
  const StatusIcon = status.icon;

  async function handlePreview(event) {
    event?.preventDefault();

    const cleanCode = normalizeTicketCode(ticketCode);

    if (!cleanCode) {
      setMessage({ type: "error", text: "Informe o código do bilhete." });
      return;
    }

    setLoadingPreview(true);
    setMessage({ type: "info", text: "Consultando bilhete..." });

    try {
      const response = await getBoardingPreview(cleanCode);
      setTicket(response);
      setTicketCode(response.ticketCode || cleanCode);
      setMessage(null);
    } catch (error) {
      setTicket(null);
      setMessage({ type: "error", text: extractApiError(error) });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleBoard() {
    if (!ticket?.ticketCode) {
      setMessage({
        type: "error",
        text: "Consulte um bilhete antes de marcar embarque."
      });
      return;
    }

    const confirmed = window.confirm(
      `Confirmar embarque de ${ticket.passengerName || "passageiro"} na ${
        ticket.seatLabel || "poltrona informada"
      }?`
    );

    if (!confirmed) return;

    setLoadingBoard(true);
    setMessage({ type: "info", text: "Marcando embarque..." });

    try {
      const response = await markBoarding(ticket.ticketCode);
      setTicket(response);
      setMessage({ type: "success", text: "Embarque confirmado com sucesso." });
    } catch (error) {
      setMessage({ type: "error", text: extractApiError(error) });

      try {
        const refreshed = await getBoardingPreview(ticket.ticketCode);
        setTicket(refreshed);
      } catch {
        // Mantém a mensagem original.
      }
    } finally {
      setLoadingBoard(false);
    }
  }

  function handleClear() {
    setTicketCode("");
    setTicket(null);
    setMessage(null);
  }

  return (
    <div className="grid gap-7">
      <section className="overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-7 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <ShieldCheck size={16} />
                Painel do fiscal
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
                Pré-validação e confirmação de embarque
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Consulte o bilhete, confira o documento oficial do passageiro e marque o embarque com segurança.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-5">
              <p className="text-xs font-black uppercase text-blue-100">
                Status do módulo
              </p>
              <p className="mt-1 text-3xl font-black text-yellowBrand">
                Módulo 52
              </p>
              <p className="text-sm font-bold text-white">
                Frontend do fiscal
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft lg:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-black text-navy">Consultar bilhete</h2>
          <p className="mt-2 text-base leading-7 text-slate-500">
            Informe o código do bilhete ou cole o código lido no QR Code.
          </p>
        </div>

        <form onSubmit={handlePreview} className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input
              className="min-h-14 w-full rounded-2xl border border-slate-200 px-12 text-base font-bold text-slate-900 outline-none transition focus:border-navy focus:ring-4 focus:ring-navy/10"
              value={ticketCode}
              onChange={(event) => setTicketCode(event.target.value)}
              placeholder="Ex: VRTK-VR1782055196429-1782055255254"
              autoComplete="off"
            />
          </div>

          <button
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-navy px-6 font-black text-white"
            type="submit"
            disabled={loadingPreview}
          >
            <FileSearch size={20} />
            {loadingPreview ? "Consultando..." : "Pré-validar"}
          </button>

          <button
            className="min-h-14 rounded-2xl bg-slate-100 px-6 font-black text-navy"
            type="button"
            onClick={handleClear}
          >
            Limpar
          </button>
        </form>

        {message && (
          <div
            className={[
              "mt-5 rounded-2xl px-5 py-4 text-sm font-black",
              message.type === "error" ? "bg-red-50 text-red-700" : "",
              message.type === "success" ? "bg-green-50 text-green-700" : "",
              message.type === "info" ? "bg-slate-100 text-navy" : ""
            ].join(" ")}
          >
            {message.text}
          </div>
        )}
      </section>

      {ticket && (
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
          <div className={`border-b px-7 py-7 lg:px-8 ${status.wrapper}`}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-5">
                <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl ${status.iconBox}`}>
                  <StatusIcon size={40} strokeWidth={2.6} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    {ticket.ticketStatus || "Status"}
                  </p>

                  <h2 className="mt-1 text-4xl font-black tracking-tight text-navy">
                    {ticket.boardingStatusTitle || "Resultado da validação"}
                  </h2>

                  <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-600">
                    {ticket.boardingStatusDescription || ticket.message}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-confirmGreen px-6 font-black text-white shadow-lg shadow-green-600/20"
                  disabled={!ticket.canBoard || loadingBoard}
                  onClick={handleBoard}
                >
                  <ClipboardCheck size={22} />
                  {loadingBoard ? "Marcando..." : "Marcar embarque"}
                </button>

                <button
                  type="button"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 font-black text-navy"
                  disabled={loadingPreview}
                  onClick={handlePreview}
                >
                  <RefreshCw size={20} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-yellowBrand/15 px-7 py-5 lg:px-8">
            <p className="text-sm font-black text-amber-900">
              Conferência obrigatória
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">
              {ticket.documentCheckMessage ||
                "Confira o documento oficial do passageiro antes de liberar o embarque."}
            </p>
          </div>

          <div className="grid gap-5 p-7 lg:grid-cols-2 lg:p-8">
            <InfoBox title="Bilhete" icon={Ticket}>
              <InfoItem label="Código" value={ticket.ticketCode} />
              <InfoItem label="Status" value={ticket.ticketStatus} />
              <InfoItem label="Reserva" value={ticket.bookingCode} />
              <InfoItem label="Status da reserva" value={ticket.bookingStatus} />
              <InfoItem label="Poltrona" value={ticket.seatLabel} />
            </InfoBox>

            <InfoBox title="Passageiro" icon={UserRound}>
              <InfoItem label="Nome" value={ticket.passengerName} />
              <InfoItem
                label={ticket.passengerDocumentLabel || "Documento"}
                value={ticket.passengerDocumentMasked || ticket.passengerDocument}
              />
              <InfoItem label="WhatsApp" value={ticket.passengerWhatsapp} />
            </InfoBox>

            <InfoBox title="Viagem" icon={Bus}>
              <InfoItem
                label="Empresa"
                value={ticket.companyDisplayName || ticket.companyTradeName || ticket.companyName}
              />
              <InfoItem label="Origem" value={ticket.originLabel} />
              <InfoItem label="Destino" value={ticket.destinationLabel} />
              <InfoItem label="Saída" value={formatDateTime(ticket.departureAt)} />
              <InfoItem label="Chegada" value={formatDateTime(ticket.arrivalAt)} />
            </InfoBox>

            <InfoBox title="Embarque" icon={ClipboardCheck}>
              <InfoItem label="Emitido em" value={formatDateTime(ticket.issuedAt)} />
              <InfoItem label="Utilizado em" value={formatDateTime(ticket.usedAt)} />
              <InfoItem label="Embarcado em" value={formatDateTime(ticket.boardedAt)} />
              <InfoItem label="Ação necessária" value={ticket.requiredAction} />
            </InfoBox>
          </div>
        </section>
      )}
    </div>
  );
}