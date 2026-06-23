import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Armchair,
  Building2,
  Bus,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Route as RouteIcon,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle
} from "lucide-react";
import { extractApiError } from "../api/client";
import {
  activateTrip,
  cancelTrip,
  completeTrip,
  createTrip,
  deleteTrip,
  listTrips,
  listTripsByCompany,
  updateTrip
} from "../api/trips";
import { listRoutes } from "../api/routes";
import { listTransportCompanies } from "../api/transportCompanies";
import { getCurrentUser } from "../utils/auth";

const initialForm = {
  transportCompanyId: "",
  routeId: "",
  departureAt: "",
  arrivalAt: "",
  price: "",
  currency: "BRL",
  totalSeats: "",
  busPlate: "",
  vehicleDescription: ""
};

const statusLabels = {
  SCHEDULED: "Agendada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  INACTIVE: "Inativa"
};

const inputClass =
  "min-h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10";

const selectClass =
  "min-h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10";

function normalizeStatus(value) {
  return String(value || "").toUpperCase();
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
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

function formatDateTimeInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMoney(value, currency = "BRL") {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return `${value} ${currency || ""}`.trim();
  }

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL"
    }).format(number);
  } catch {
    return `${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number)} ${currency || ""}`.trim();
  }
}

function getTripId(trip) {
  return trip.id || trip.tripId || "";
}

function getCompanyId(company) {
  return company.id || company.transportCompanyId || "";
}

function getRouteId(route) {
  return route.id || route.routeId || "";
}

function getCompanyName(company) {
  return (
    company.tradeName ||
    company.companyTradeName ||
    company.name ||
    company.transportCompanyName ||
    "-"
  );
}

function getTripCompanyName(trip) {
  return (
    trip.transportCompanyTradeName ||
    trip.companyTradeName ||
    trip.transportCompanyName ||
    trip.companyName ||
    "-"
  );
}

function getRouteOrigin(route) {
  const city = route.originCity || "-";
  const state = route.originState ? ` - ${route.originState}` : "";
  const terminal = route.originTerminal ? ` | ${route.originTerminal}` : "";

  return `${city}${state}${terminal}`;
}

function getRouteDestination(route) {
  const city = route.destinationCity || "-";
  const state = route.destinationState ? ` - ${route.destinationState}` : "";
  const terminal = route.destinationTerminal
    ? ` | ${route.destinationTerminal}`
    : "";

  return `${city}${state}${terminal}`;
}

function getRouteLabel(route) {
  return `${getRouteOrigin(route)} → ${getRouteDestination(route)}`;
}

function getShortRouteLabel(route) {
  const origin = route.originCity || "-";
  const destination = route.destinationCity || "-";
  const originState = route.originState ? `/${route.originState}` : "";
  const destinationState = route.destinationState
    ? `/${route.destinationState}`
    : "";

  return `${origin}${originState} → ${destination}${destinationState}`;
}

function getTripOrigin(trip) {
  const city = trip.originCity || "-";
  const state = trip.originState ? ` - ${trip.originState}` : "";
  const terminal = trip.originTerminal ? ` | ${trip.originTerminal}` : "";

  return `${city}${state}${terminal}`;
}

function getTripDestination(trip) {
  const city = trip.destinationCity || "-";
  const state = trip.destinationState ? ` - ${trip.destinationState}` : "";
  const terminal = trip.destinationTerminal
    ? ` | ${trip.destinationTerminal}`
    : "";

  return `${city}${state}${terminal}`;
}

function statusPill(status) {
  const normalized = normalizeStatus(status);

  const styles = {
    SCHEDULED: "bg-blue-50 text-blue-700 ring-blue-200",
    COMPLETED: "bg-green-50 text-green-700 ring-green-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    INACTIVE: "bg-slate-100 text-slate-700 ring-slate-200"
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        styles[normalized] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {statusLabels[normalized] || normalized || "-"}
    </span>
  );
}

function buildTripPayload(form) {
  const price = form.price === "" ? null : Number(form.price);
  const totalSeats = form.totalSeats === "" ? null : Number(form.totalSeats);

  return {
    transportCompanyId: form.transportCompanyId,
    routeId: form.routeId,
    departureAt: form.departureAt,
    arrivalAt: form.arrivalAt,
    price: Number.isNaN(price) ? null : price,
    currency: form.currency.trim() || "BRL",
    totalSeats: Number.isNaN(totalSeats) ? null : totalSeats,
    busPlate: form.busPlate.trim() || null,
    vehicleDescription: form.vehicleDescription.trim() || null
  };
}

function mapTripToForm(trip) {
  return {
    transportCompanyId: trip.transportCompanyId || "",
    routeId: trip.routeId || "",
    departureAt: formatDateTimeInput(trip.departureAt),
    arrivalAt: formatDateTimeInput(trip.arrivalAt),
    price:
      trip.price === null || trip.price === undefined ? "" : String(trip.price),
    currency: trip.currency || "BRL",
    totalSeats:
      trip.totalSeats === null || trip.totalSeats === undefined
        ? ""
        : String(trip.totalSeats),
    busPlate: trip.busPlate || "",
    vehicleDescription: trip.vehicleDescription || ""
  };
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
    <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 break-words text-3xl font-black tracking-tight text-navy lg:text-4xl">
            {value}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}
        >
          <Icon size={26} strokeWidth={2.8} />
        </div>
      </div>
    </article>
  );
}

function FieldLabel({ children }) {
  return <span className="text-sm font-black text-navy">{children}</span>;
}

export default function TripsPanel() {
  const currentUser = getCurrentUser();

  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [routeFilter, setRouteFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const isAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "ROLE_ADMIN";

  const metrics = useMemo(() => {
    const scheduled = trips.filter(
      (trip) => normalizeStatus(trip.status) === "SCHEDULED"
    );

    const completed = trips.filter(
      (trip) => normalizeStatus(trip.status) === "COMPLETED"
    );

    const cancelled = trips.filter(
      (trip) => normalizeStatus(trip.status) === "CANCELLED"
    );

    const totalSeats = trips.reduce((total, trip) => {
      const value = Number(trip.totalSeats || 0);
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);

    const availableSeats = trips.reduce((total, trip) => {
      const value = Number(trip.availableSeats || 0);
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);

    return {
      total: trips.length,
      scheduled: scheduled.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalSeats,
      availableSeats,
      occupiedSeats: Math.max(totalSeats - availableSeats, 0)
    };
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const term = query.trim().toLowerCase();

    return trips.filter((trip) => {
      const tripStatus = normalizeStatus(trip.status);
      const tripCompanyId = trip.transportCompanyId || "";
      const tripRouteId = trip.routeId || "";

      const matchesStatus =
        statusFilter === "ALL" || tripStatus === statusFilter;

      const matchesCompany =
        companyFilter === "ALL" || tripCompanyId === companyFilter;

      const matchesRoute = routeFilter === "ALL" || tripRouteId === routeFilter;

      const matchesQuery =
        !term ||
        [
          trip.id,
          trip.tripCode,
          trip.transportCompanyName,
          trip.transportCompanyTradeName,
          trip.companyName,
          trip.companyTradeName,
          trip.originCity,
          trip.originState,
          trip.originTerminal,
          trip.destinationCity,
          trip.destinationState,
          trip.destinationTerminal,
          trip.busPlate,
          trip.vehicleDescription,
          trip.status,
          getTripOrigin(trip),
          getTripDestination(trip)
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesStatus && matchesCompany && matchesRoute && matchesQuery;
    });
  }, [companyFilter, query, routeFilter, statusFilter, trips]);

  async function loadTrips() {
    setLoading(true);
    setMessage(null);
    setAccessDenied(false);

    try {
      const [routesData, companiesData] = await Promise.allSettled([
        listRoutes(),
        isAdmin ? listTransportCompanies() : Promise.resolve([])
      ]);

      if (routesData.status === "fulfilled") {
        setRoutes(Array.isArray(routesData.value) ? routesData.value : []);
      }

      if (companiesData.status === "fulfilled") {
        setCompanies(
          Array.isArray(companiesData.value) ? companiesData.value : []
        );
      }

      let tripsData = [];

      if (isAdmin) {
        tripsData = await listTrips();
      } else if (currentUser?.transportCompanyId) {
        tripsData = await listTripsByCompany(currentUser.transportCompanyId);
      } else {
        tripsData = await listTrips();
      }

      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (error) {
      if (error?.response?.status === 403) {
        setAccessDenied(true);
      }

      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  function updateFormField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function openCreateForm() {
    setEditingTripId(null);

    setForm({
      ...initialForm,
      transportCompanyId:
        !isAdmin && currentUser?.transportCompanyId
          ? currentUser.transportCompanyId
          : "",
      routeId: ""
    });

    setShowForm(true);
    setMessage(null);
  }

  function openEditForm(trip) {
    setEditingTripId(getTripId(trip));
    setForm(mapTripToForm(trip));
    setShowForm(true);
    setMessage(null);
  }

  function closeForm() {
    setEditingTripId(null);
    setForm(initialForm);
    setShowForm(false);
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setCompanyFilter("ALL");
    setRouteFilter("ALL");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);

    const payload = buildTripPayload(form);

    try {
      if (editingTripId) {
        await updateTrip(editingTripId, payload);

        setMessage({
          type: "success",
          text: "Viagem atualizada com sucesso."
        });
      } else {
        await createTrip(payload);

        setMessage({
          type: "success",
          text: "Viagem criada com sucesso."
        });
      }

      closeForm();
      await loadTrips();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(trip) {
    const tripId = getTripId(trip);

    const confirmed = window.confirm("Deseja ativar esta viagem?");

    if (!confirmed) {
      return;
    }

    setChangingId(tripId);
    setMessage(null);

    try {
      await activateTrip(tripId);

      setMessage({
        type: "success",
        text: "Viagem ativada com sucesso."
      });

      await loadTrips();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleCancel(trip) {
    const tripId = getTripId(trip);

    const confirmed = window.confirm("Deseja cancelar esta viagem?");

    if (!confirmed) {
      return;
    }

    setChangingId(tripId);
    setMessage(null);

    try {
      await cancelTrip(tripId);

      setMessage({
        type: "success",
        text: "Viagem cancelada com sucesso."
      });

      await loadTrips();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleComplete(trip) {
    const tripId = getTripId(trip);

    const confirmed = window.confirm("Deseja concluir esta viagem?");

    if (!confirmed) {
      return;
    }

    setChangingId(tripId);
    setMessage(null);

    try {
      await completeTrip(tripId);

      setMessage({
        type: "success",
        text: "Viagem concluída com sucesso."
      });

      await loadTrips();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleDelete(trip) {
    const tripId = getTripId(trip);

    const confirmed = window.confirm(
      `Deseja excluir definitivamente a viagem ${getTripOrigin(
        trip
      )} → ${getTripDestination(trip)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(tripId);
    setMessage(null);

    try {
      await deleteTrip(tripId);

      setMessage({
        type: "success",
        text: "Viagem excluída com sucesso."
      });

      await loadTrips();
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
        <div className="border-b-8 border-yellowBrand px-7 py-8 lg:px-10 lg:py-10">
          <div className="flex min-w-0 flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <CalendarClock size={16} />
                Viagens
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
                Gestão real de viagens
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Cadastre, edite e acompanhe viagens com empresa, rota, horários,
                preço, assentos, veículo e status operacional.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadTrips}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 font-black text-white"
              >
                <RefreshCw size={20} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-6 font-black text-navy"
              >
                <Plus size={20} />
                Nova viagem
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

      {accessDenied && (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-7">
          <div className="flex gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle size={28} strokeWidth={2.8} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-amber-900">
                Acesso restrito
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-amber-800">
                A gestão de viagens exige perfil administrativo ou gestor
                autorizado.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Viagens"
          value={metrics.total}
          description="Total cadastrado."
          icon={CalendarClock}
          tone="navy"
        />

        <MetricCard
          title="Agendadas"
          value={metrics.scheduled}
          description="Programadas para operação."
          icon={Clock3}
          tone="blue"
        />

        <MetricCard
          title="Concluídas"
          value={metrics.completed}
          description="Viagens finalizadas."
          icon={CheckCircle2}
          tone="green"
        />

        <MetricCard
          title="Assentos"
          value={metrics.availableSeats}
          description={`${metrics.occupiedSeats} ocupados de ${metrics.totalSeats}.`}
          icon={Armchair}
          tone="yellow"
        />
      </section>

      {showForm && (
        <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-navy">
                {editingTripId ? "Editar viagem" : "Nova viagem"}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Preencha a empresa, rota, horários, preço, assentos e dados do
                veículo.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 font-black text-navy"
            >
              <X size={18} />
              Fechar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid min-w-0 gap-6">
            <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                  <Building2 size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-navy">
                    Empresa e rota
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Selecione a empresa de transporte e a rota da viagem.
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Empresa</FieldLabel>

                  <select
                    name="transportCompanyId"
                    value={form.transportCompanyId}
                    onChange={updateFormField}
                    required
                    disabled={!isAdmin && Boolean(currentUser?.transportCompanyId)}
                    className={`${selectClass} disabled:bg-slate-100`}
                  >
                    <option value="">Selecione a empresa</option>

                    {isAdmin ? (
                      companies.map((company) => (
                        <option
                          key={getCompanyId(company)}
                          value={getCompanyId(company)}
                        >
                          {getCompanyName(company)}
                        </option>
                      ))
                    ) : (
                      currentUser?.transportCompanyId && (
                        <option value={currentUser.transportCompanyId}>
                          Minha empresa
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Rota</FieldLabel>

                  <select
                    name="routeId"
                    value={form.routeId}
                    onChange={updateFormField}
                    required
                    className={selectClass}
                  >
                    <option value="">Selecione a rota</option>

                    {routes.map((route) => (
                      <option key={getRouteId(route)} value={getRouteId(route)}>
                        {getShortRouteLabel(route)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-100 text-green-700">
                  <CalendarClock size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-navy">
                    Horários e preço
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Defina saída, chegada, valor e moeda da viagem.
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 gap-5 lg:grid-cols-4">
                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Saída</FieldLabel>

                  <input
                    type="datetime-local"
                    name="departureAt"
                    value={form.departureAt}
                    onChange={updateFormField}
                    required
                    className={inputClass}
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Chegada</FieldLabel>

                  <input
                    type="datetime-local"
                    name="arrivalAt"
                    value={form.arrivalAt}
                    onChange={updateFormField}
                    required
                    className={inputClass}
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Preço</FieldLabel>

                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={updateFormField}
                    min="0.01"
                    step="0.01"
                    required
                    className={inputClass}
                    placeholder="Ex: 129.90"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Moeda</FieldLabel>

                  <input
                    name="currency"
                    value={form.currency}
                    onChange={updateFormField}
                    maxLength={10}
                    className={`${inputClass} uppercase`}
                    placeholder="BRL"
                  />
                </label>
              </div>
            </div>

            <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-yellowBrand/20 text-amber-700">
                  <Bus size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-navy">
                    Veículo e assentos
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Informe assentos, placa e descrição do veículo.
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 gap-5 lg:grid-cols-3">
                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Total de assentos</FieldLabel>

                  <input
                    type="number"
                    name="totalSeats"
                    value={form.totalSeats}
                    onChange={updateFormField}
                    min="1"
                    step="1"
                    required
                    className={inputClass}
                    placeholder="Ex: 46"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Placa</FieldLabel>

                  <input
                    name="busPlate"
                    value={form.busPlate}
                    onChange={updateFormField}
                    maxLength={30}
                    className={`${inputClass} uppercase`}
                    placeholder="Ex: ABC1D23"
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <FieldLabel>Descrição do veículo</FieldLabel>

                  <input
                    name="vehicleDescription"
                    value={form.vehicleDescription}
                    onChange={updateFormField}
                    maxLength={160}
                    className={inputClass}
                    placeholder="Ex: Executivo com ar-condicionado"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 font-black text-navy"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {editingTripId ? "Salvar alterações" : "Criar viagem"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-navy">
              Filtros de viagens
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Busque por origem, destino, empresa, rota, veículo, status ou ID
              da viagem.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 px-5 font-black text-navy"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-2 xl:col-span-2">
            <FieldLabel>Buscar</FieldLabel>

            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={19}
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-12 w-full min-w-0 rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                placeholder="Buscar viagem..."
              />
            </div>
          </label>

          <label className="grid min-w-0 gap-2">
            <FieldLabel>Status</FieldLabel>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={selectClass}
            >
              <option value="ALL">Todos os status</option>
              <option value="SCHEDULED">Agendadas</option>
              <option value="COMPLETED">Concluídas</option>
              <option value="CANCELLED">Canceladas</option>
              <option value="INACTIVE">Inativas</option>
            </select>
          </label>

          <label className="grid min-w-0 gap-2">
            <FieldLabel>Rota</FieldLabel>

            <select
              value={routeFilter}
              onChange={(event) => setRouteFilter(event.target.value)}
              className={selectClass}
            >
              <option value="ALL">Todas as rotas</option>

              {routes.map((route) => (
                <option key={getRouteId(route)} value={getRouteId(route)}>
                  {getShortRouteLabel(route)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isAdmin && (
          <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
            <label className="grid min-w-0 gap-2">
              <FieldLabel>Empresa</FieldLabel>

              <select
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className={selectClass}
              >
                <option value="ALL">Todas as empresas</option>

                {companies.map((company) => (
                  <option key={getCompanyId(company)} value={getCompanyId(company)}>
                    {getCompanyName(company)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-600">
          Resultado filtrado: {filteredTrips.length} viagens
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-7 py-6">
          <h2 className="text-2xl font-black text-navy">
            Viagens cadastradas
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Lista real carregada do backend VaiRápido.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm font-black text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            Carregando viagens...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="grid place-items-center p-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-slate-500">
              <CalendarClock size={30} />
            </div>

            <h3 className="mt-4 text-xl font-black text-navy">
              Nenhuma viagem encontrada
            </h3>

            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              Cadastre uma nova viagem ou ajuste os filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[1320px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Viagem
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Empresa
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Horários
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Preço
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Assentos
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTrips.map((trip) => {
                  const tripId = getTripId(trip);
                  const busy = changingId === tripId;
                  const status = normalizeStatus(trip.status);
                  const canActivate =
                    status === "INACTIVE" || status === "CANCELLED";
                  const canCancel =
                    status !== "CANCELLED" && status !== "COMPLETED";
                  const canComplete =
                    status !== "COMPLETED" &&
                    status !== "CANCELLED" &&
                    status !== "INACTIVE";

                  return (
                    <tr
                      key={tripId}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-7 py-5">
                        <div className="flex gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                            <RouteIcon size={23} strokeWidth={2.8} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-black text-navy">
                              <span>{getTripOrigin(trip)}</span>
                              <ArrowRight
                                size={17}
                                className="text-yellowBrand"
                                strokeWidth={3}
                              />
                              <span>{getTripDestination(trip)}</span>
                            </div>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              Veículo: {valueOrDash(trip.vehicleDescription)}
                            </p>

                            {tripId && (
                              <p className="mt-1 max-w-[520px] truncate text-xs font-bold text-slate-400">
                                {trip.tripCode || tripId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <Building2 size={17} className="text-slate-400" />
                          {getTripCompanyName(trip)}
                        </div>
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-700">
                        <div className="grid gap-1">
                          <span>Saída: {formatDateTime(trip.departureAt)}</span>
                          <span>Chegada: {formatDateTime(trip.arrivalAt)}</span>
                        </div>
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <CircleDollarSign
                            size={17}
                            className="text-slate-400"
                          />
                          {formatMoney(trip.price, trip.currency)}
                        </div>
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-700">
                        <div className="grid gap-1">
                          <span>Total: {valueOrDash(trip.totalSeats)}</span>
                          <span>
                            Disponíveis: {valueOrDash(trip.availableSeats)}
                          </span>
                        </div>
                      </td>

                      <td className="px-7 py-5">{statusPill(trip.status)}</td>

                      <td className="px-7 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(trip)}
                            disabled={busy}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-xs font-black text-navy disabled:opacity-50"
                          >
                            <Edit3 size={15} />
                            Editar
                          </button>

                          {canActivate && (
                            <button
                              type="button"
                              onClick={() => handleActivate(trip)}
                              disabled={busy}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 text-xs font-black text-blue-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                <Power size={15} />
                              )}
                              Ativar
                            </button>
                          )}

                          {canComplete && (
                            <button
                              type="button"
                              onClick={() => handleComplete(trip)}
                              disabled={busy}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-green-50 px-4 text-xs font-black text-green-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                <ShieldCheck size={15} />
                              )}
                              Concluir
                            </button>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancel(trip)}
                              disabled={busy}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 text-xs font-black text-red-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                <XCircle size={15} />
                              )}
                              Cancelar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(trip)}
                            disabled={busy}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-xs font-black text-red-700 disabled:opacity-50"
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" size={15} />
                            ) : (
                              <Trash2 size={15} />
                            )}
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}