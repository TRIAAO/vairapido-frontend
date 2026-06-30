import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  cancelPayment,
  confirmPayment,
  createPayment,
  expirePayment,
  listPayments
} from "../api/payments";

const initialForm = {
  bookingId: "",
  method: "PIX"
};

const statusLabels = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  FAILED: "Falhou"
};

const methodLabels = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  CASH: "Dinheiro",
  BANK_TRANSFER: "Transferência bancária",
  MULTICAIXA_EXPRESS: "Multicaixa Express",
  UNITEL_MONEY: "Unitel Money",
  AFRIMONEY: "Afrimoney"
};

const paymentMethods = [
  "PIX",
  "CASH",
  "BANK_TRANSFER",
  "MULTICAIXA_EXPRESS",
  "UNITEL_MONEY",
  "AFRIMONEY",
  "CREDIT_CARD",
  "DEBIT_CARD"
];

const statusOptions = ["PENDING", "PAID", "CANCELLED", "EXPIRED", "FAILED"];

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

function getPaymentId(payment) {
  return payment.id || payment.paymentId || "";
}

function getPaymentCode(payment) {
  return payment.paymentCode || payment.code || payment.id || "-";
}

function getBookingCode(payment) {
  return payment.bookingCode || payment.booking?.bookingCode || payment.bookingId || "-";
}

function getPassengerName(payment) {
  return (
    payment.passengerName ||
    payment.passengerFullName ||
    payment.passenger?.fullName ||
    payment.passenger?.name ||
    "-"
  );
}

function getPassengerDocument(payment) {
  return (
    payment.passengerDocument ||
    payment.passenger?.document ||
    payment.passenger?.documentNumber ||
    "-"
  );
}

function getPassengerWhatsapp(payment) {
  return (
    payment.passengerWhatsapp ||
    payment.passengerPhone ||
    payment.passenger?.whatsapp ||
    payment.passenger?.phone ||
    "-"
  );
}

function getCompanyName(payment) {
  return (
    payment.companyTradeName ||
    payment.companyName ||
    payment.transportCompanyTradeName ||
    payment.transportCompanyName ||
    payment.booking?.companyTradeName ||
    payment.booking?.companyName ||
    "Sem empresa"
  );
}

function getRouteLabel(payment) {
  const origin =
    payment.originCity ||
    payment.originLabel ||
    payment.route?.originCity ||
    payment.trip?.originCity ||
    "-";

  const destination =
    payment.destinationCity ||
    payment.destinationLabel ||
    payment.route?.destinationCity ||
    payment.trip?.destinationCity ||
    "-";

  return `${origin} → ${destination}`;
}

function getAmount(payment) {
  return payment.amount || payment.totalAmount || payment.price || payment.paidAmount || 0;
}

function getCurrency(payment) {
  return String(payment.currency || payment.booking?.currency || "BRL").toUpperCase();
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
    PENDING: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40",
    PAID: "bg-green-50 text-green-700 ring-green-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    EXPIRED: "bg-slate-100 text-slate-700 ring-slate-200",
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

function MethodBadge({ method }) {
  const normalized = String(method || "").toUpperCase();

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">
      {methodLabels[normalized] || normalized || "-"}
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
        "inline-flex min-h-10 items-center justify-center rounded-2xl px-4 text-xs font-black transition disabled:cursor-not-allowed",
        tones[tone]
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function PaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);

  const methodOptions = useMemo(() => {
    const values = payments.map((payment) => payment.method).filter(Boolean);
    return Array.from(new Set([...values, ...paymentMethods])).sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [payments]);

  const currencyOptions = useMemo(() => {
    const currencies = payments.map((payment) => getCurrency(payment)).filter(Boolean);
    return Array.from(new Set(currencies)).sort((a, b) => a.localeCompare(b));
  }, [payments]);

  const metrics = useMemo(() => {
    const pending = payments.filter(
      (payment) => normalizeStatus(payment.status) === "PENDING"
    );
    const paid = payments.filter((payment) => normalizeStatus(payment.status) === "PAID");
    const problems = payments.filter((payment) =>
      ["CANCELLED", "EXPIRED", "FAILED"].includes(normalizeStatus(payment.status))
    );

    const byCurrency = payments.reduce((acc, payment) => {
      const currency = getCurrency(payment);
      const amount = Number(getAmount(payment));
      const status = normalizeStatus(payment.status);

      if (!acc[currency]) {
        acc[currency] = {
          currency,
          country: getCountryByCurrency(currency),
          paidTotal: 0,
          pendingTotal: 0,
          count: 0
        };
      }

      if (status === "PAID") {
        acc[currency].paidTotal += Number.isNaN(amount) ? 0 : amount;
      }

      if (status === "PENDING") {
        acc[currency].pendingTotal += Number.isNaN(amount) ? 0 : amount;
      }

      acc[currency].count += 1;
      return acc;
    }, {});

    return {
      total: payments.length,
      pending: pending.length,
      paid: paid.length,
      problems: problems.length,
      byCurrency: Object.values(byCurrency)
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const term = normalizeText(query);

    return payments.filter((payment) => {
      const status = normalizeStatus(payment.status);
      const method = String(payment.method || "").toUpperCase();
      const currency = getCurrency(payment);

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesMethod = methodFilter === "ALL" || method === methodFilter;
      const matchesCurrency =
        currencyFilter === "ALL" || currency === currencyFilter;

      const matchesQuery =
        !term ||
        [
          getPaymentCode(payment),
          getBookingCode(payment),
          getPassengerName(payment),
          getPassengerDocument(payment),
          getPassengerWhatsapp(payment),
          getCompanyName(payment),
          getRouteLabel(payment),
          status,
          method,
          currency,
          getCountryByCurrency(currency),
          payment.gatewayName,
          payment.gatewayTransactionId
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));

      return matchesStatus && matchesMethod && matchesCurrency && matchesQuery;
    });
  }, [currencyFilter, methodFilter, payments, query, statusFilter]);

  async function loadPayments() {
    setLoading(true);
    setMessage(null);

    try {
      const data = await listPayments();
      setPayments(Array.isArray(data) ? data : []);
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
    loadPayments();
  }, []);

  function updateFormField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setCurrencyFilter("ALL");
  }

  function closeForm() {
    setShowForm(false);
    setForm(initialForm);
  }

  async function handleCreatePayment(event) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);

    try {
      await createPayment({
        bookingId: form.bookingId.trim(),
        method: form.method
      });

      setMessage({
        type: "success",
        text: "Pagamento criado com sucesso."
      });

      closeForm();
      await loadPayments();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(payment) {
    const paymentId = getPaymentId(payment);
    const confirmed = window.confirm(
      `Confirmar o pagamento ${getPaymentCode(payment)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(paymentId);
    setMessage(null);

    try {
      await confirmPayment(paymentId);

      setMessage({
        type: "success",
        text: "Pagamento confirmado com sucesso."
      });

      await loadPayments();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleCancel(payment) {
    const paymentId = getPaymentId(payment);
    const confirmed = window.confirm(
      `Cancelar o pagamento ${getPaymentCode(payment)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(paymentId);
    setMessage(null);

    try {
      await cancelPayment(paymentId);

      setMessage({
        type: "success",
        text: "Pagamento cancelado com sucesso."
      });

      await loadPayments();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleExpire(payment) {
    const paymentId = getPaymentId(payment);
    const confirmed = window.confirm(
      `Expirar o pagamento ${getPaymentCode(payment)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(paymentId);
    setMessage(null);

    try {
      await expirePayment(paymentId);

      setMessage({
        type: "success",
        text: "Pagamento expirado com sucesso."
      });

      await loadPayments();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleCopyPix(payment) {
    const copied = await copyToClipboard(payment.pixCopyPaste);

    setMessage({
      type: copied ? "success" : "error",
      text: copied
        ? "Código Pix copiado."
        : "Não foi possível copiar o código Pix."
    });
  }

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <WalletCards size={16} />
                Módulo 69
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Gestão real de pagamentos
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Controle Pix, dinheiro, transferência, Multicaixa, Unitel Money,
                Afrimoney e cartões sem misturar moedas.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadPayments}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white"
              >
                <RefreshCw size={18} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy"
              >
                <Plus size={18} />
                Novo pagamento
              </button>
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

      {loading ? (
        <section className="flex min-h-56 items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-10 text-sm font-black text-slate-500 shadow-soft">
          <Loader2 className="animate-spin" size={22} />
          Carregando pagamentos...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Pagamentos"
              value={metrics.total}
              description="Total carregado no painel."
              icon={WalletCards}
              tone="navy"
            />

            <MetricCard
              title="Pendentes"
              value={metrics.pending}
              description="Aguardando confirmação."
              icon={CreditCard}
              tone="yellow"
            />

            <MetricCard
              title="Pagos"
              value={metrics.paid}
              description="Confirmados no sistema."
              icon={CheckCircle2}
              tone="green"
            />

            <MetricCard
              title="Problemas"
              value={metrics.problems}
              description="Cancelados, expirados ou falhos."
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
                    {formatMoney(item.paidTotal, item.currency)}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-blue-800">
                    Pago confirmado · pendente{" "}
                    {formatMoney(item.pendingTotal, item.currency)}
                  </p>
                </article>
              ))}
            </section>
          )}

          {showForm && (
            <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-navy">Novo pagamento</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Informe o ID da reserva e o método de pagamento aceito pelo backend.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 text-sm font-black text-navy"
                >
                  <X size={18} />
                  Fechar
                </button>
              </div>

              <form onSubmit={handleCreatePayment} className="grid min-w-0 gap-4 lg:grid-cols-[1.4fr_0.8fr_auto]">
                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-black text-navy">ID da reserva</span>
                  <input
                    name="bookingId"
                    value={form.bookingId}
                    onChange={updateFormField}
                    required
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="UUID da reserva"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-black text-navy">Método</span>
                  <select
                    name="method"
                    value={form.method}
                    onChange={updateFormField}
                    required
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {methodLabels[method] || method}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    Criar
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
                  <Search size={15} />
                  Filtros
                </div>

                <h2 className="text-2xl font-black text-navy">Controle dos pagamentos</h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Filtros por status, método e país/moeda para leitura limpa em 100% de zoom.
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

            <div className="grid min-w-0 gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
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
                    placeholder="Pagamento, reserva, passageiro, gateway..."
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
                <span className="text-sm font-black text-navy">Método</span>

                <select
                  value={methodFilter}
                  onChange={(event) => setMethodFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todos</option>
                  {methodOptions.map((method) => (
                    <option key={method} value={method}>
                      {methodLabels[method] || method}
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
              <h2 className="text-2xl font-black text-navy">Pagamentos encontrados</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {filteredPayments.length} pagamento(s) no filtro atual.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Pagamento
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Reserva
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
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map((payment) => {
                    const paymentId = getPaymentId(payment);
                    const status = normalizeStatus(payment.status);
                    const currency = getCurrency(payment);
                    const loadingAction = changingId === paymentId;

                    const canConfirm = status === "PENDING";
                    const canCancel = status === "PENDING";
                    const canExpire = status === "PENDING";

                    return (
                      <tr
                        key={paymentId || getPaymentCode(payment)}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="break-all text-sm font-black text-navy">
                              {getPaymentCode(payment)}
                            </p>
                            <div className="mt-1">
                              <MethodBadge method={payment.method} />
                            </div>
                            <p className="text-xs font-bold text-slate-500">
                              Criado: {formatDateTime(payment.createdAt)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Expira: {formatDateTime(payment.expiresAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="break-all text-sm font-black text-navy">
                              {getBookingCode(payment)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Status reserva: {valueOrDash(payment.bookingStatus)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Assento: {valueOrDash(payment.seatNumber)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="text-sm font-black text-navy">
                              {getPassengerName(payment)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Doc: {getPassengerDocument(payment)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              WhatsApp: {getPassengerWhatsapp(payment)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="max-w-[220px] text-sm font-black text-navy">
                              {getRouteLabel(payment)}
                            </p>
                            <p className="max-w-[220px] truncate text-xs font-bold text-slate-500">
                              {getCompanyName(payment)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Saída: {formatDateTime(payment.departureAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <p className="text-sm font-black text-navy">
                            {formatMoney(getAmount(payment), currency)}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {getCountryByCurrency(currency)} · {currency}
                          </p>
                          {payment.gatewayName && (
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              Gateway: {payment.gatewayName}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-5 align-top">
                          {statusPill(status)}
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="flex min-w-[300px] flex-wrap gap-2">
                            <ActionButton
                              tone="green"
                              disabled={!canConfirm || loadingAction}
                              onClick={() => handleConfirm(payment)}
                            >
                              {loadingAction ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                "Confirmar"
                              )}
                            </ActionButton>

                            <ActionButton
                              tone="red"
                              disabled={!canCancel || loadingAction}
                              onClick={() => handleCancel(payment)}
                            >
                              Cancelar
                            </ActionButton>

                            <ActionButton
                              tone="slate"
                              disabled={!canExpire || loadingAction}
                              onClick={() => handleExpire(payment)}
                            >
                              Expirar
                            </ActionButton>

                            {payment.pixCopyPaste && (
                              <ActionButton
                                tone="yellow"
                                disabled={false}
                                onClick={() => handleCopyPix(payment)}
                              >
                                <Copy size={14} />
                              </ActionButton>
                            )}

                            {payment.pixQrCodeUrl && (
                              <a
                                href={payment.pixQrCodeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-blue-50 px-4 text-xs font-black text-blue-700 ring-1 ring-blue-200"
                              >
                                <QrCode size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPayments.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm font-black text-slate-500"
                      >
                        Nenhum pagamento encontrado.
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
                  Módulo 69 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  A tela separa pagamentos por país/moeda para evitar soma incorreta
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
