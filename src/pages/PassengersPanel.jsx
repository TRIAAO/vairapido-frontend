import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Edit3,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserRoundCheck,
  Users,
  X
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  createPassenger,
  deletePassenger,
  listPassengers,
  updatePassenger
} from "../api/passengers";

const emptyForm = {
  fullName: "",
  documentNumber: "",
  email: "",
  phone: "",
  whatsapp: "",
  birthDate: ""
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function getPassengerId(passenger) {
  return passenger.id || passenger.passengerId || "";
}

function getPassengerName(passenger) {
  return passenger.fullName || passenger.name || passenger.passengerName || "-";
}

function getDocumentNumber(passenger) {
  return passenger.documentNumber || passenger.document || passenger.passengerDocument || "-";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short"
  }).format(date);
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

function getAge(birthDate) {
  if (!birthDate) {
    return null;
  }

  const date = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasNotHadBirthdayThisYear =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());

  if (hasNotHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

function inferDocumentType(documentNumber) {
  const value = String(documentNumber || "").replace(/\D/g, "");

  if (value.length === 11) {
    return "CPF provável";
  }

  const raw = String(documentNumber || "").trim();

  if (/^\d{9}[A-Z]{2}\d{3}$/i.test(raw) || /^\d{9}[A-Z]{2}\d{3}$/i.test(raw.replace(/\s/g, ""))) {
    return "BI provável";
  }

  if (raw.length >= 6) {
    return "Documento";
  }

  return "-";
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

export default function PassengersPanel() {
  const [passengers, setPassengers] = useState([]);
  const [query, setQuery] = useState("");
  const [contactFilter, setContactFilter] = useState("ALL");

  const [form, setForm] = useState(emptyForm);
  const [editingPassenger, setEditingPassenger] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);

  const metrics = useMemo(() => {
    const withWhatsapp = passengers.filter((passenger) => Boolean(passenger.whatsapp));
    const withEmail = passengers.filter((passenger) => Boolean(passenger.email));
    const minors = passengers.filter((passenger) => {
      const age = getAge(passenger.birthDate);
      return age !== null && age < 18;
    });

    return {
      total: passengers.length,
      withWhatsapp: withWhatsapp.length,
      withEmail: withEmail.length,
      minors: minors.length
    };
  }, [passengers]);

  const filteredPassengers = useMemo(() => {
    const term = normalizeText(query);

    return passengers.filter((passenger) => {
      const hasWhatsapp = Boolean(passenger.whatsapp);
      const hasEmail = Boolean(passenger.email);
      const age = getAge(passenger.birthDate);

      const matchesContact =
        contactFilter === "ALL" ||
        (contactFilter === "WHATSAPP" && hasWhatsapp) ||
        (contactFilter === "EMAIL" && hasEmail) ||
        (contactFilter === "MINOR" && age !== null && age < 18) ||
        (contactFilter === "WITHOUT_CONTACT" && !hasWhatsapp && !hasEmail);

      const matchesQuery =
        !term ||
        [
          passenger.id,
          getPassengerName(passenger),
          getDocumentNumber(passenger),
          passenger.email,
          passenger.phone,
          passenger.whatsapp,
          passenger.birthDate,
          inferDocumentType(getDocumentNumber(passenger))
        ]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(term));

      return matchesContact && matchesQuery;
    });
  }, [contactFilter, passengers, query]);

  async function loadPassengers() {
    setLoading(true);
    setMessage(null);

    try {
      const data = await listPassengers();
      setPassengers(Array.isArray(data) ? data : []);
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
    loadPassengers();
  }, []);

  function updateFormField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function openCreateForm() {
    setEditingPassenger(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(passenger) {
    setEditingPassenger(passenger);
    setForm({
      fullName: passenger.fullName || "",
      documentNumber: passenger.documentNumber || "",
      email: passenger.email || "",
      phone: passenger.phone || "",
      whatsapp: passenger.whatsapp || "",
      birthDate: passenger.birthDate ? String(passenger.birthDate).slice(0, 10) : ""
    });
    setShowForm(true);
  }

  function closeForm() {
    setEditingPassenger(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  function clearFilters() {
    setQuery("");
    setContactFilter("ALL");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);

    const payload = {
      fullName: form.fullName.trim(),
      documentNumber: form.documentNumber.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      birthDate: form.birthDate || null
    };

    try {
      if (editingPassenger) {
        await updatePassenger(getPassengerId(editingPassenger), payload);

        setMessage({
          type: "success",
          text: "Passageiro atualizado com sucesso."
        });
      } else {
        await createPassenger(payload);

        setMessage({
          type: "success",
          text: "Passageiro criado com sucesso."
        });
      }

      closeForm();
      await loadPassengers();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(passenger) {
    const passengerId = getPassengerId(passenger);
    const confirmed = window.confirm(
      `Excluir o passageiro ${getPassengerName(passenger)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(passengerId);
    setMessage(null);

    try {
      await deletePassenger(passengerId);

      setMessage({
        type: "success",
        text: "Passageiro excluído com sucesso."
      });

      await loadPassengers();
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
                <Users size={16} />
                Módulo 71
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Gestão real de passageiros
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Cadastre e acompanhe passageiros com documento, WhatsApp, telefone,
                e-mail e nascimento.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadPassengers}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white"
              >
                <RefreshCw size={18} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy"
              >
                <Plus size={18} />
                Novo passageiro
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
          Carregando passageiros...
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Passageiros"
              value={metrics.total}
              description="Total cadastrado."
              icon={Users}
              tone="navy"
            />

            <MetricCard
              title="Com WhatsApp"
              value={metrics.withWhatsapp}
              description="Prontos para atendimento."
              icon={MessageCircle}
              tone="green"
            />

            <MetricCard
              title="Com e-mail"
              value={metrics.withEmail}
              description="Contato alternativo."
              icon={Mail}
              tone="blue"
            />

            <MetricCard
              title="Menores"
              value={metrics.minors}
              description="Exigem atenção operacional."
              icon={ShieldCheck}
              tone="yellow"
            />
          </section>

          {showForm && (
            <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-navy">
                    {editingPassenger ? "Editar passageiro" : "Novo passageiro"}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Documento livre para Brasil e Angola: CPF, BI ou Passaporte.
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

              <form onSubmit={handleSubmit} className="grid min-w-0 gap-4 lg:grid-cols-2">
                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-black text-navy">Nome completo</span>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={updateFormField}
                    required
                    maxLength={160}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Nome completo do passageiro"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-black text-navy">Documento</span>
                  <input
                    name="documentNumber"
                    value={form.documentNumber}
                    onChange={updateFormField}
                    required
                    maxLength={30}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="CPF, BI ou Passaporte"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-black text-navy">E-mail</span>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateFormField}
                    maxLength={160}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="email@exemplo.com"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-black text-navy">Data de nascimento</span>
                  <input
                    name="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={updateFormField}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-black text-navy">Telefone</span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={updateFormField}
                    maxLength={40}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="+55 ou +244"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-sm font-black text-navy">WhatsApp</span>
                  <input
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={updateFormField}
                    maxLength={40}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="+55 ou +244"
                  />
                </label>

                <div className="flex justify-end lg:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <UserRoundCheck size={18} />
                    )}
                    {editingPassenger ? "Salvar alterações" : "Criar passageiro"}
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

                <h2 className="text-2xl font-black text-navy">Controle de passageiros</h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Busca por nome, documento, contato ou tipo de documento.
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

            <div className="grid min-w-0 gap-4 lg:grid-cols-[1.4fr_0.8fr]">
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
                    placeholder="Nome, documento, WhatsApp, e-mail..."
                  />
                </div>
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-black text-navy">Contato</span>

                <select
                  value={contactFilter}
                  onChange={(event) => setContactFilter(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                >
                  <option value="ALL">Todos</option>
                  <option value="WHATSAPP">Com WhatsApp</option>
                  <option value="EMAIL">Com e-mail</option>
                  <option value="MINOR">Menores de idade</option>
                  <option value="WITHOUT_CONTACT">Sem WhatsApp/e-mail</option>
                </select>
              </label>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-black text-navy">Passageiros encontrados</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {filteredPassengers.length} passageiro(s) no filtro atual.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Passageiro
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Documento
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Contatos
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Nascimento
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Cadastro
                    </th>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPassengers.map((passenger) => {
                    const passengerId = getPassengerId(passenger);
                    const age = getAge(passenger.birthDate);
                    const loadingAction = changingId === passengerId;

                    return (
                      <tr
                        key={passengerId || getDocumentNumber(passenger)}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-5 align-top">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                              <User size={21} strokeWidth={2.8} />
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate text-sm font-black text-navy">
                                {getPassengerName(passenger)}
                              </p>
                              <p className="mt-1 break-all text-xs font-bold text-slate-500">
                                ID: {passengerId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="text-sm font-black text-navy">
                              {getDocumentNumber(passenger)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {inferDocumentType(getDocumentNumber(passenger))}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-2">
                            <p className="flex items-center gap-2 text-xs font-bold text-slate-600">
                              <MessageCircle size={14} />
                              {valueOrDash(passenger.whatsapp)}
                            </p>
                            <p className="flex items-center gap-2 text-xs font-bold text-slate-600">
                              <Phone size={14} />
                              {valueOrDash(passenger.phone)}
                            </p>
                            <p className="flex items-center gap-2 text-xs font-bold text-slate-600">
                              <Mail size={14} />
                              {valueOrDash(passenger.email)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="text-sm font-black text-navy">
                              {formatDate(passenger.birthDate)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {age === null ? "Idade não informada" : `${age} anos`}
                            </p>
                            {age !== null && age < 18 && (
                              <p className="text-xs font-black text-amber-700">
                                Menor de idade
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="grid gap-1">
                            <p className="text-xs font-bold text-slate-500">
                              Criado: {formatDateTime(passenger.createdAt)}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              Atualizado: {formatDateTime(passenger.updatedAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="flex min-w-[190px] flex-wrap gap-2">
                            <ActionButton
                              tone="yellow"
                              disabled={loadingAction}
                              onClick={() => openEditForm(passenger)}
                            >
                              <Edit3 size={14} />
                              Editar
                            </ActionButton>

                            <ActionButton
                              tone="red"
                              disabled={loadingAction}
                              onClick={() => handleDelete(passenger)}
                            >
                              {loadingAction ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Excluir
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPassengers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm font-black text-slate-500"
                      >
                        Nenhum passageiro encontrado.
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
                  Módulo 71 aplicado
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                  O cadastro aceita documento livre para o modelo multi-país:
                  CPF, BI ou Passaporte. O backend ainda não possui campo de país
                  no passageiro.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
