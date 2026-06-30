import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardCopy,
  CreditCard,
  FileText,
  Globe2,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck
} from "lucide-react";
import {
  COUNTRY_SETTINGS,
  detectCountryByRouteText
} from "../utils/countrySettings";

function copyToClipboard(value) {
  if (!value) {
    return;
  }

  navigator.clipboard?.writeText(value);
}

function InfoCard({ title, value, description, icon: Icon, tone = "navy" }) {
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

          <h3 className="mt-3 break-words text-2xl font-black tracking-tight text-navy">
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

function Pill({ children }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-navy ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function CountryCard({ country }) {
  return (
    <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-6 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
            <Globe2 size={15} />
            País ativo
          </div>

          <h2 className="text-3xl font-black text-navy">
            {country.flag} {country.country}
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Regras operacionais para compra de passagem pelo WhatsApp.
          </p>
        </div>

        <div className="rounded-3xl bg-yellowBrand px-5 py-4 text-navy">
          <p className="text-xs font-black uppercase tracking-wide">Moeda</p>
          <p className="mt-1 text-2xl font-black">{country.currency}</p>
          <p className="text-sm font-bold">{country.currencyName}</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-navy">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-black text-navy">Documentos aceitos</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {country.documentTypes.map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-navy">
              <CreditCard size={20} />
            </div>
            <h3 className="text-lg font-black text-navy">Pagamentos aceitos</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {country.paymentMethods.map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-navy">
              <MapPin size={20} />
            </div>
            <h3 className="text-lg font-black text-navy">Cidades reconhecidas</h3>
          </div>

          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
            {country.cities.map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-navy">
              <MessageCircle size={20} />
            </div>
            <h3 className="text-lg font-black text-navy">Exemplos de mensagem</h3>
          </div>

          <div className="grid gap-2">
            {country.examples.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm font-bold text-slate-600">
                  {item}
                </span>

                <button
                  type="button"
                  onClick={() => copyToClipboard(item)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-yellowBrand text-navy"
                  title="Copiar exemplo"
                >
                  <ClipboardCopy size={15} />
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
        <div className="mb-3 flex items-center gap-3">
          <ShieldCheck className="text-blue-700" size={22} />
          <h3 className="text-lg font-black text-blue-900">Observações</h3>
        </div>

        <div className="grid gap-2">
          {country.notes.map((note) => (
            <p
              key={note}
              className="flex gap-2 text-sm font-semibold leading-6 text-blue-800"
            >
              <CheckCircle2 className="mt-1 shrink-0" size={15} />
              <span>{note}</span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function CountrySettingsPanel() {
  const [routeText, setRouteText] = useState("");
  const detectedCountry = useMemo(
    () => detectCountryByRouteText(routeText),
    [routeText]
  );

  const totalCities = COUNTRY_SETTINGS.reduce(
    (total, country) => total + country.cities.length,
    0
  );
  const totalPayments = COUNTRY_SETTINGS.reduce(
    (total, country) => total + country.paymentMethods.length,
    0
  );
  const configJson = JSON.stringify(COUNTRY_SETTINGS, null, 2);

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0 overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
        <div className="border-b-8 border-yellowBrand px-6 py-7 lg:px-8 lg:py-8">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
                <Globe2 size={16} />
                Módulo 73
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight lg:text-4xl">
                Configurações Multi-país
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-blue-100 lg:text-base">
                Central operacional para Brasil e Angola: moeda, documentos,
                pagamentos e detecção automática por cidade.
              </p>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(configJson)}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-yellowBrand px-5 text-sm font-black text-navy"
            >
              <ClipboardCopy size={18} />
              Copiar JSON
            </button>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          title="Países"
          value={COUNTRY_SETTINGS.length}
          description="Brasil e Angola no mesmo sistema."
          icon={Globe2}
          tone="navy"
        />

        <InfoCard
          title="Cidades"
          value={totalCities}
          description="Base para identificar o país."
          icon={MapPin}
          tone="blue"
        />

        <InfoCard
          title="Moedas"
          value="BRL / AOA"
          description="Nunca somar moedas diferentes."
          icon={Banknote}
          tone="green"
        />

        <InfoCard
          title="Pagamentos"
          value={totalPayments}
          description="Métodos configurados por país."
          icon={CreditCard}
          tone="yellow"
        />
      </section>

      <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-navy">
              <Search size={15} />
              Simulador
            </div>

            <h2 className="text-2xl font-black text-navy">
              Detecção por cidade
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Digite uma rota ou cidade para ver como o painel identifica o país.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-black text-navy">Texto recebido no WhatsApp</span>

            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                value={routeText}
                onChange={(event) => setRouteText(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                placeholder="Ex.: Luanda > Benguela 26/06/2026"
              />
            </div>
          </label>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Resultado
            </p>

            {detectedCountry ? (
              <div className="mt-3">
                <h3 className="text-2xl font-black text-navy">
                  {detectedCountry.flag} {detectedCountry.country}
                </h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Moeda: {detectedCountry.currency} · Documento:{" "}
                  {detectedCountry.documentTypes.join(" ou ")}
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <h3 className="text-xl font-black text-amber-700">
                  País não identificado
                </h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  O robô deve perguntar: Brasil ou Angola?
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-7">
        {COUNTRY_SETTINGS.map((country) => (
          <CountryCard key={country.id} country={country} />
        ))}
      </div>

      <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700">
            <AlertTriangle size={24} strokeWidth={2.8} />
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-black text-blue-900">
              Módulo 73 aplicado
            </h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
              Esta tela centraliza as regras multi-país no frontend. Quando o
              backend tiver endpoints de configuração, esta mesma tela poderá
              salvar e editar as regras dinamicamente.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
