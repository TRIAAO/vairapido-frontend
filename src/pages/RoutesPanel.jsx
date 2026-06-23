import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Compass,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Power,
  PowerOff,
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
  activateRoute,
  createRoute,
  deactivateRoute,
  deleteRoute,
  listRoutes,
  updateRoute
} from "../api/routes";

const initialForm = {
  originCity: "",
  originState: "",
  originTerminal: "",
  destinationCity: "",
  destinationState: "",
  destinationTerminal: "",
  distanceKm: "",
  estimatedDurationMinutes: ""
};

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

function formatDistance(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return `${value} km`;
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1
  }).format(number)} km`;
}

function formatDuration(minutes) {
  const value = Number(minutes);

  if (!minutes || Number.isNaN(value)) {
    return "-";
  }

  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  if (hours <= 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

function getRouteId(route) {
  return route.id || route.routeId || "";
}

function getOriginLabel(route) {
  const city = route.originCity || "-";
  const state = route.originState ? ` - ${route.originState}` : "";
  const terminal = route.originTerminal ? ` | ${route.originTerminal}` : "";

  return `${city}${state}${terminal}`;
}

function getDestinationLabel(route) {
  const city = route.destinationCity || "-";
  const state = route.destinationState ? ` - ${route.destinationState}` : "";
  const terminal = route.destinationTerminal
    ? ` | ${route.destinationTerminal}`
    : "";

  return `${city}${state}${terminal}`;
}

function getRouteLabel(route) {
  return `${getOriginLabel(route)} → ${getDestinationLabel(route)}`;
}

function isRouteActive(route) {
  if (typeof route.active === "boolean") {
    return route.active;
  }

  if (typeof route.enabled === "boolean") {
    return route.enabled;
  }

  if (route.status) {
    return normalizeStatus(route.status) === "ACTIVE";
  }

  return true;
}

function statusPill(route) {
  const active = isRouteActive(route);
  const status = normalizeStatus(route.status);

  if (active) {
    return (
      <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
        {status || "ACTIVE"}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
      {status || "INACTIVE"}
    </span>
  );
}

function buildRoutePayload(form) {
  const distance = form.distanceKm === "" ? null : Number(form.distanceKm);
  const duration =
    form.estimatedDurationMinutes === ""
      ? null
      : Number(form.estimatedDurationMinutes);

  return {
    originCity: form.originCity.trim(),
    originState: form.originState.trim() || null,
    originTerminal: form.originTerminal.trim() || null,
    destinationCity: form.destinationCity.trim(),
    destinationState: form.destinationState.trim() || null,
    destinationTerminal: form.destinationTerminal.trim() || null,
    distanceKm: Number.isNaN(distance) ? null : distance,
    estimatedDurationMinutes: Number.isNaN(duration) ? null : duration
  };
}

function mapRouteToForm(route) {
  return {
    originCity: route.originCity || "",
    originState: route.originState || "",
    originTerminal: route.originTerminal || "",
    destinationCity: route.destinationCity || "",
    destinationState: route.destinationState || "",
    destinationTerminal: route.destinationTerminal || "",
    distanceKm:
      route.distanceKm === null || route.distanceKm === undefined
        ? ""
        : String(route.distanceKm),
    estimatedDurationMinutes:
      route.estimatedDurationMinutes === null ||
      route.estimatedDurationMinutes === undefined
        ? ""
        : String(route.estimatedDurationMinutes)
  };
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

        <div
          className={`grid h-14 w-14 place-items-center rounded-2xl ${tones[tone]}`}
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

export default function RoutesPanel() {
  const [routes, setRoutes] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const metrics = useMemo(() => {
    const active = routes.filter((route) => isRouteActive(route));
    const inactive = routes.filter((route) => !isRouteActive(route));
    const withDistance = routes.filter(
      (route) =>
        route.distanceKm !== null &&
        route.distanceKm !== undefined &&
        route.distanceKm !== ""
    );

    const totalDistance = withDistance.reduce((total, route) => {
      const value = Number(route.distanceKm);
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);

    return {
      total: routes.length,
      active: active.length,
      inactive: inactive.length,
      withDistance: withDistance.length,
      totalDistance
    };
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    const term = query.trim().toLowerCase();

    return routes.filter((route) => {
      const active = isRouteActive(route);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && active) ||
        (statusFilter === "INACTIVE" && !active);

      const matchesQuery =
        !term ||
        [
          route.originCity,
          route.originState,
          route.originTerminal,
          route.destinationCity,
          route.destinationState,
          route.destinationTerminal,
          route.status,
          route.id,
          getRouteLabel(route)
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesStatus && matchesQuery;
    });
  }, [query, routes, statusFilter]);

  async function loadRoutes() {
    setLoading(true);
    setMessage(null);
    setAccessDenied(false);

    try {
      const data = await listRoutes();
      setRoutes(Array.isArray(data) ? data : []);
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
    loadRoutes();
  }, []);

  function updateFormField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function openCreateForm() {
    setEditingRouteId(null);
    setForm(initialForm);
    setShowForm(true);
    setMessage(null);
  }

  function openEditForm(route) {
    setEditingRouteId(getRouteId(route));
    setForm(mapRouteToForm(route));
    setShowForm(true);
    setMessage(null);
  }

  function closeForm() {
    setEditingRouteId(null);
    setForm(initialForm);
    setShowForm(false);
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);

    const payload = buildRoutePayload(form);

    try {
      if (editingRouteId) {
        await updateRoute(editingRouteId, payload);

        setMessage({
          type: "success",
          text: "Rota atualizada com sucesso."
        });
      } else {
        await createRoute(payload);

        setMessage({
          type: "success",
          text: "Rota criada com sucesso."
        });
      }

      closeForm();
      await loadRoutes();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(route) {
    const routeId = getRouteId(route);
    const active = isRouteActive(route);
    const action = active ? "desativar" : "ativar";

    const confirmed = window.confirm(`Deseja ${action} esta rota?`);

    if (!confirmed) {
      return;
    }

    setChangingId(routeId);
    setMessage(null);

    try {
      if (active) {
        await deactivateRoute(routeId);
      } else {
        await activateRoute(routeId);
      }

      setMessage({
        type: "success",
        text: active
          ? "Rota desativada com sucesso."
          : "Rota ativada com sucesso."
      });

      await loadRoutes();
    } catch (error) {
      setMessage({
        type: "error",
        text: extractApiError(error)
      });
    } finally {
      setChangingId(null);
    }
  }

  async function handleDelete(route) {
    const routeId = getRouteId(route);

    const confirmed = window.confirm(
      `Deseja excluir definitivamente a rota ${getOriginLabel(
        route
      )} → ${getDestinationLabel(route)}?`
    );

    if (!confirmed) {
      return;
    }

    setChangingId(routeId);
    setMessage(null);

    try {
      await deleteRoute(routeId);

      setMessage({
        type: "success",
        text: "Rota excluída com sucesso."
      });

      await loadRoutes();
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
    <div className="grid gap-7">
      <section className="overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-7 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <RouteIcon size={16} />
                Rotas
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
                Gestão real de rotas
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                Cadastre, edite, ative, desative e acompanhe rotas com origem,
                destino, terminais, distância e duração estimada.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadRoutes}
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
                Nova rota
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
                A gestão de rotas exige perfil administrativo ou gestor
                autorizado.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Rotas"
          value={metrics.total}
          description="Total cadastrado."
          icon={RouteIcon}
          tone="navy"
        />

        <MetricCard
          title="Ativas"
          value={metrics.active}
          description="Liberadas para operação."
          icon={CheckCircle2}
          tone="green"
        />

        <MetricCard
          title="Inativas"
          value={metrics.inactive}
          description="Bloqueadas ou suspensas."
          icon={XCircle}
          tone="red"
        />

        <MetricCard
          title="Distância"
          value={formatDistance(metrics.totalDistance)}
          description={`${metrics.withDistance} rotas com distância.`}
          icon={Compass}
          tone="yellow"
        />
      </section>

      {showForm && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-navy">
                {editingRouteId ? "Editar rota" : "Nova rota"}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Preencha os dados de origem, destino, distância e duração
                estimada.
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

          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                  <MapPin size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-navy">Origem</h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Cidade, estado/província e terminal de partida.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <label className="grid gap-2">
                  <FieldLabel>Cidade de origem</FieldLabel>
                  <input
                    name="originCity"
                    value={form.originCity}
                    onChange={updateFormField}
                    required
                    maxLength={120}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Ex: São Paulo"
                  />
                </label>

                <label className="grid gap-2">
                  <FieldLabel>Estado/Província</FieldLabel>
                  <input
                    name="originState"
                    value={form.originState}
                    onChange={updateFormField}
                    maxLength={80}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Ex: SP"
                  />
                </label>

                <label className="grid gap-2">
                  <FieldLabel>Terminal de origem</FieldLabel>
                  <input
                    name="originTerminal"
                    value={form.originTerminal}
                    onChange={updateFormField}
                    maxLength={160}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Ex: Terminal Rodoviário Tietê"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-100 text-green-700">
                  <MapPin size={22} strokeWidth={2.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-navy">Destino</h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Cidade, estado/província e terminal de chegada.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <label className="grid gap-2">
                  <FieldLabel>Cidade de destino</FieldLabel>
                  <input
                    name="destinationCity"
                    value={form.destinationCity}
                    onChange={updateFormField}
                    required
                    maxLength={120}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Ex: Rio de Janeiro"
                  />
                </label>

                <label className="grid gap-2">
                  <FieldLabel>Estado/Província</FieldLabel>
                  <input
                    name="destinationState"
                    value={form.destinationState}
                    onChange={updateFormField}
                    maxLength={80}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Ex: RJ"
                  />
                </label>

                <label className="grid gap-2">
                  <FieldLabel>Terminal de destino</FieldLabel>
                  <input
                    name="destinationTerminal"
                    value={form.destinationTerminal}
                    onChange={updateFormField}
                    maxLength={160}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    placeholder="Ex: Rodoviária Novo Rio"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2">
                <FieldLabel>Distância em KM</FieldLabel>
                <input
                  type="number"
                  name="distanceKm"
                  value={form.distanceKm}
                  onChange={updateFormField}
                  min="0.1"
                  step="0.1"
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="Ex: 430"
                />
              </label>

              <label className="grid gap-2">
                <FieldLabel>Duração estimada em minutos</FieldLabel>
                <input
                  type="number"
                  name="estimatedDurationMinutes"
                  value={form.estimatedDurationMinutes}
                  onChange={updateFormField}
                  min="1"
                  step="1"
                  className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                  placeholder="Ex: 390"
                />
              </label>
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
                {editingRouteId ? "Salvar alterações" : "Criar rota"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-navy">
              Filtros de rotas
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Busque por origem, destino, terminal, status ou ID da rota.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 font-black text-navy"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2">
            <FieldLabel>Buscar</FieldLabel>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={19}
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                placeholder="Buscar rota..."
              />
            </div>
          </label>

          <label className="grid gap-2">
            <FieldLabel>Status</FieldLabel>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="INACTIVE">Inativas</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-600">
          Resultado filtrado: {filteredRoutes.length} rotas
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-7 py-6">
          <h2 className="text-2xl font-black text-navy">
            Rotas cadastradas
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Lista real carregada do backend VaiRápido.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm font-black text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            Carregando rotas...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Rota
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Distância
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Duração
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Criado em
                  </th>
                  <th className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRoutes.map((route) => {
                  const routeId = getRouteId(route);
                  const busy = changingId === routeId;
                  const active = isRouteActive(route);

                  return (
                    <tr
                      key={routeId || getRouteLabel(route)}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-7 py-5">
                        <div className="flex gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy/10 text-navy">
                            <RouteIcon size={23} strokeWidth={2.8} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-black text-navy">
                              <span>{getOriginLabel(route)}</span>
                              <ArrowRight
                                size={17}
                                className="text-yellowBrand"
                                strokeWidth={3}
                              />
                              <span>{getDestinationLabel(route)}</span>
                            </div>

                            {routeId && (
                              <p className="mt-1 max-w-[520px] truncate text-xs font-bold text-slate-400">
                                {routeId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <Compass size={17} className="text-slate-400" />
                          {formatDistance(route.distanceKm)}
                        </div>
                      </td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <Clock3 size={17} className="text-slate-400" />
                          {formatDuration(route.estimatedDurationMinutes)}
                        </div>
                      </td>

                      <td className="px-7 py-5">{statusPill(route)}</td>

                      <td className="px-7 py-5 text-sm font-bold text-slate-600">
                        {formatDateTime(route.createdAt)}
                      </td>

                      <td className="px-7 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openEditForm(route)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-navy disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Edit3 size={16} />
                            Editar
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleStatus(route)}
                            className={[
                              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-60",
                              active
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                            ].join(" ")}
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : active ? (
                              <PowerOff size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                            {active ? "Desativar" : "Ativar"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(route)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-100 px-3 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRoutes.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-7 py-10 text-center text-sm font-black text-slate-500"
                    >
                      Nenhuma rota encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-700">
            <ShieldCheck size={25} strokeWidth={2.8} />
          </div>

          <div>
            <h3 className="text-lg font-black text-blue-900">
              Segurança operacional
            </h3>

            <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
              Rotas podem estar vinculadas a viagens e reservas. Antes de
              excluir uma rota, confirme se ela não possui operação dependente.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}