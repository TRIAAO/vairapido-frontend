import { listBookings } from "./bookings";
import { listPayments } from "./payments";
import { listTickets } from "./tickets";
import { listWhatsAppMessages } from "./whatsapp";
import { getOperationalIncidents } from "./incidents";
import { COUNTRY_SETTINGS, detectCountryByRouteText } from "../utils/countrySettings";

const currencyCountry = { AOA: "Angola", BRL: "Brasil" };
const countryFlag = Object.fromEntries(COUNTRY_SETTINGS.map((item) => [item.country, item.flag]));
const countryCurrency = Object.fromEntries(COUNTRY_SETTINGS.map((item) => [item.country, item.currency]));

function asArray(value) { return Array.isArray(value) ? value : []; }
function status(value) { return String(value || "").trim().toUpperCase(); }
function currency(value) { return String(value || "").trim().toUpperCase(); }
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function amount(item) { return number(item?.amount ?? item?.totalAmount ?? item?.price ?? item?.value ?? item?.booking?.amount ?? 0); }
function itemCurrency(item) { return currency(item?.currency || item?.bookingCurrency || item?.paymentCurrency || item?.booking?.currency || ""); }
function passenger(item) { return item?.passengerName || item?.passengerFullName || item?.passenger?.fullName || item?.fullName || item?.name || "-"; }
function company(item) { return item?.companyTradeName || item?.companyName || item?.transportCompanyTradeName || item?.transportCompanyName || item?.booking?.companyName || item?.trip?.transportCompany?.tradeName || item?.trip?.transportCompany?.name || "Sem empresa"; }
function reference(item) { return item?.bookingCode || item?.ticketCode || item?.paymentCode || item?.referenceCode || item?.code || item?.id || "-"; }
function dateOf(item) { return item?.sentAt || item?.failedAt || item?.usedAt || item?.issuedAt || item?.paidAt || item?.createdAt || item?.updatedAt || null; }

function routeLabel(item) {
  const origin = item?.originCity || item?.routeOriginCity || item?.route?.originCity || item?.trip?.originCity || item?.trip?.route?.originCity || item?.booking?.originCity || item?.booking?.routeOriginCity || "";
  const destination = item?.destinationCity || item?.routeDestinationCity || item?.route?.destinationCity || item?.trip?.destinationCity || item?.trip?.route?.destinationCity || item?.booking?.destinationCity || item?.booking?.routeDestinationCity || "";
  if (origin || destination) return `${origin || "-"} → ${destination || "-"}`;
  return item?.routeLabel || "-";
}

function inferCountry(item) {
  const c = itemCurrency(item);
  if (currencyCountry[c]) return currencyCountry[c];
  const detected = detectCountryByRouteText(routeLabel(item));
  if (detected?.country) return detected.country;
  const text = [item?.originCity, item?.destinationCity, item?.country, item?.toPhone, item?.phone, item?.whatsapp].filter(Boolean).join(" ");
  const byText = detectCountryByRouteText(text);
  return byText?.country || "Não identificado";
}

function seed(name) {
  return {
    country: name,
    flag: countryFlag[name] || "🌍",
    currency: countryCurrency[name] || "-",
    revenue: {},
    bookings: 0,
    paidBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    expiredBookings: 0,
    payments: 0,
    paidPayments: 0,
    failedPayments: 0,
    tickets: 0,
    validTickets: 0,
    usedTickets: 0,
    cancelledTickets: 0,
    whatsapp: 0,
    whatsappSent: 0,
    whatsappPending: 0,
    whatsappFailed: 0,
    incidents: 0,
    criticalIncidents: 0,
    warningIncidents: 0,
    routes: {},
    companies: {},
    activity: []
  };
}

function ensure(stats, name) {
  const key = name || "Não identificado";
  if (!stats[key]) stats[key] = seed(key);
  return stats[key];
}

function addRevenue(country, cur, value) {
  const key = cur || country.currency || "N/A";
  country.revenue[key] = (country.revenue[key] || 0) + number(value);
}

function addRank(map, label, cur, value) {
  const key = label && label !== "-" ? label : "Não informado";
  if (!map[key]) map[key] = { label: key, count: 0, revenue: {} };
  map[key].count += 1;
  if (cur) map[key].revenue[cur] = (map[key].revenue[cur] || 0) + number(value);
}

function addActivity(country, entry) {
  if (!entry.date) return;
  country.activity.push({ id: `${entry.type}-${entry.ref}-${entry.date}`, ...entry });
}

function top(map) { return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 6); }

function processBookings(stats, items) {
  items.forEach((item) => {
    const c = ensure(stats, inferCountry(item));
    const st = status(item.status);
    const cur = itemCurrency(item) || c.currency;
    const val = amount(item);
    c.bookings += 1;
    if (st === "PENDING_PAYMENT") c.pendingBookings += 1;
    if (["PAID", "TICKET_ISSUED"].includes(st)) { c.paidBookings += 1; addRevenue(c, cur, val); }
    if (["CANCELLED", "CANCELED"].includes(st)) c.cancelledBookings += 1;
    if (st === "EXPIRED") c.expiredBookings += 1;
    addRank(c.routes, routeLabel(item), cur, val);
    addRank(c.companies, company(item), cur, val);
    addActivity(c, { type: "Reserva", status: st, ref: reference(item), date: dateOf(item), title: `Reserva ${reference(item)}`, description: `${passenger(item)} · ${routeLabel(item)}`, amount: val, currency: cur });
  });
}

function processPayments(stats, items) {
  items.forEach((item) => {
    const c = ensure(stats, inferCountry(item));
    const st = status(item.status);
    const cur = itemCurrency(item) || c.currency;
    const val = amount(item);
    c.payments += 1;
    if (["PAID", "CONFIRMED", "APPROVED"].includes(st)) { c.paidPayments += 1; addRevenue(c, cur, val); }
    if (["FAILED", "CANCELLED", "CANCELED", "EXPIRED"].includes(st)) c.failedPayments += 1;
    addActivity(c, { type: "Pagamento", status: st, ref: reference(item), date: dateOf(item), title: `Pagamento ${reference(item)}`, description: `${passenger(item)} · ${item.method || "método não informado"}`, amount: val, currency: cur });
  });
}

function processTickets(stats, items) {
  items.forEach((item) => {
    const c = ensure(stats, inferCountry(item));
    const st = status(item.status);
    c.tickets += 1;
    if (st === "VALID") c.validTickets += 1;
    if (st === "USED") c.usedTickets += 1;
    if (["CANCELLED", "CANCELED"].includes(st)) c.cancelledTickets += 1;
    addRank(c.routes, routeLabel(item), itemCurrency(item), 0);
    addRank(c.companies, company(item), itemCurrency(item), 0);
    addActivity(c, { type: "Bilhete", status: st, ref: reference(item), date: dateOf(item), title: `Bilhete ${reference(item)}`, description: `${passenger(item)} · ${routeLabel(item)}`, amount: amount(item), currency: itemCurrency(item) || c.currency });
  });
}

function processWhatsApp(stats, items) {
  items.forEach((item) => {
    const c = ensure(stats, inferCountry(item));
    const st = status(item.status);
    c.whatsapp += 1;
    if (st === "SENT") c.whatsappSent += 1;
    if (st === "PENDING") c.whatsappPending += 1;
    if (st === "FAILED") c.whatsappFailed += 1;
    addActivity(c, { type: "WhatsApp", status: st, ref: reference(item), date: dateOf(item), title: `WhatsApp ${item.messageType || "-"}`, description: `${item.passengerName || "-"} · ${item.toPhone || "-"}`, amount: 0, currency: "" });
  });
}

function processIncidents(stats, items) {
  items.forEach((item) => {
    const c = ensure(stats, item.country && item.country !== "-" ? item.country : inferCountry(item.raw || item));
    c.incidents += 1;
    if (item.severity === "critical") c.criticalIncidents += 1;
    if (item.severity === "warning") c.warningIncidents += 1;
  });
}

function normalize(item) {
  return {
    ...item,
    routes: top(item.routes),
    companies: top(item.companies),
    activity: item.activity.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12)
  };
}

function totals(countries) {
  return countries.reduce((acc, c) => {
    acc.bookings += c.bookings;
    acc.pendingBookings += c.pendingBookings;
    acc.tickets += c.tickets;
    acc.usedTickets += c.usedTickets;
    acc.whatsapp += c.whatsapp;
    acc.whatsappPending += c.whatsappPending;
    acc.incidents += c.incidents;
    acc.criticalIncidents += c.criticalIncidents;
    Object.entries(c.revenue).forEach(([cur, val]) => acc.revenue[cur] = (acc.revenue[cur] || 0) + val);
    return acc;
  }, { bookings: 0, pendingBookings: 0, tickets: 0, usedTickets: 0, whatsapp: 0, whatsappPending: 0, incidents: 0, criticalIncidents: 0, revenue: {} });
}

export async function getExecutiveDashboard() {
  const [bookingsResult, paymentsResult, ticketsResult, whatsappResult, incidentsResult] = await Promise.allSettled([
    listBookings(), listPayments(), listTickets(), listWhatsAppMessages(), getOperationalIncidents()
  ]);

  const bookings = bookingsResult.status === "fulfilled" ? asArray(bookingsResult.value) : [];
  const payments = paymentsResult.status === "fulfilled" ? asArray(paymentsResult.value) : [];
  const tickets = ticketsResult.status === "fulfilled" ? asArray(ticketsResult.value) : [];
  const whatsapp = whatsappResult.status === "fulfilled" ? asArray(whatsappResult.value) : [];
  const incidents = incidentsResult.status === "fulfilled" ? asArray(incidentsResult.value?.incidents) : [];

  const stats = {};
  COUNTRY_SETTINGS.forEach((country) => ensure(stats, country.country));
  processBookings(stats, bookings);
  processPayments(stats, payments);
  processTickets(stats, tickets);
  processWhatsApp(stats, whatsapp);
  processIncidents(stats, incidents);

  const countries = Object.values(stats).map(normalize);

  return {
    countries,
    global: totals(countries),
    errors: {
      bookings: bookingsResult.status === "rejected" ? bookingsResult.reason : null,
      payments: paymentsResult.status === "rejected" ? paymentsResult.reason : null,
      tickets: ticketsResult.status === "rejected" ? ticketsResult.reason : null,
      whatsapp: whatsappResult.status === "rejected" ? whatsappResult.reason : null,
      incidents: incidentsResult.status === "rejected" ? incidentsResult.reason : null
    }
  };
}
