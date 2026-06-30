import { listBookings } from "./bookings";
import { listPayments } from "./payments";
import { listTickets } from "./tickets";
import { listWhatsAppMessages } from "./whatsapp";

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function getId(item) {
  return item?.id || item?.bookingId || item?.paymentId || item?.ticketId || "";
}

function getDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesSince(value) {
  const date = getDate(value);

  if (!date) {
    return null;
  }

  return Math.floor((Date.now() - date.getTime()) / 60000);
}

function isPast(value) {
  const date = getDate(value);
  return date ? date.getTime() < Date.now() : false;
}

function isWithinMinutes(value, minutes) {
  const date = getDate(value);

  if (!date) {
    return false;
  }

  const diff = date.getTime() - Date.now();
  return diff > 0 && diff <= minutes * 60000;
}

function getBookingCode(item) {
  return item?.bookingCode || item?.booking?.bookingCode || item?.referenceCode || "-";
}

function getTicketCode(item) {
  return item?.ticketCode || item?.code || item?.referenceCode || "-";
}

function getPaymentCode(item) {
  return item?.paymentCode || item?.code || "-";
}

function getPassengerName(item) {
  return (
    item?.passengerName ||
    item?.passengerFullName ||
    item?.passenger?.fullName ||
    item?.fullName ||
    item?.name ||
    "-"
  );
}

function getPassengerPhone(item) {
  return (
    item?.passengerWhatsapp ||
    item?.passengerPhone ||
    item?.toPhone ||
    item?.passenger?.whatsapp ||
    item?.passenger?.phone ||
    "-"
  );
}

function getCompanyName(item) {
  return (
    item?.companyTradeName ||
    item?.companyName ||
    item?.transportCompanyTradeName ||
    item?.transportCompanyName ||
    item?.booking?.companyTradeName ||
    item?.booking?.companyName ||
    "Sistema"
  );
}

function getRouteLabel(item) {
  const origin =
    item?.originCity ||
    item?.originLabel ||
    item?.route?.originCity ||
    item?.trip?.originCity ||
    item?.trip?.route?.originCity ||
    "";

  const destination =
    item?.destinationCity ||
    item?.destinationLabel ||
    item?.route?.destinationCity ||
    item?.trip?.destinationCity ||
    item?.trip?.route?.destinationCity ||
    "";

  if (origin || destination) {
    return `${origin || "-"} → ${destination || "-"}`;
  }

  return "-";
}

function getCurrency(item) {
  return String(item?.currency || item?.booking?.currency || "BRL").toUpperCase();
}

function getCountryByCurrency(currency) {
  if (currency === "AOA") {
    return "Angola";
  }

  if (currency === "BRL") {
    return "Brasil";
  }

  return "Outro país";
}

function buildIncident({
  source,
  type,
  severity,
  status,
  title,
  description,
  recommendation,
  reference,
  entityId,
  passengerName,
  passengerPhone,
  companyName,
  routeLabel,
  country,
  currency,
  createdAt,
  dueAt,
  raw
}) {
  return {
    id: `${source}-${type}-${entityId || reference || Math.random()}-${createdAt || dueAt || ""}`,
    source,
    type,
    severity,
    status,
    title,
    description,
    recommendation,
    reference,
    entityId,
    passengerName,
    passengerPhone,
    companyName,
    routeLabel,
    country,
    currency,
    createdAt,
    dueAt,
    raw
  };
}

function buildBookingIncidents(bookings = []) {
  const incidents = [];

  bookings.forEach((booking) => {
    const status = normalizeStatus(booking.status);
    const currency = getCurrency(booking);
    const country = getCountryByCurrency(currency);
    const reference = getBookingCode(booking);

    if (status === "PENDING_PAYMENT" && isPast(booking.expiresAt)) {
      incidents.push(
        buildIncident({
          source: "Reservas",
          type: "RESERVA_VENCIDA_NAO_EXPIRADA",
          severity: "critical",
          status,
          title: "Reserva pendente já venceu",
          description: `A reserva ${reference} está pendente e passou do prazo de expiração.`,
          recommendation: "Expirar a reserva ou confirmar pagamento caso tenha sido pago manualmente.",
          reference,
          entityId: getId(booking),
          passengerName: getPassengerName(booking),
          passengerPhone: getPassengerPhone(booking),
          companyName: getCompanyName(booking),
          routeLabel: getRouteLabel(booking),
          country,
          currency,
          createdAt: booking.createdAt,
          dueAt: booking.expiresAt,
          raw: booking
        })
      );
    }

    if (status === "PENDING_PAYMENT" && isWithinMinutes(booking.expiresAt, 60)) {
      incidents.push(
        buildIncident({
          source: "Reservas",
          type: "RESERVA_PRESTES_A_EXPIRAR",
          severity: "warning",
          status,
          title: "Reserva prestes a expirar",
          description: `A reserva ${reference} vence em menos de 1 hora.`,
          recommendation: "Reenviar instruções de pagamento pelo WhatsApp ou contactar o passageiro.",
          reference,
          entityId: getId(booking),
          passengerName: getPassengerName(booking),
          passengerPhone: getPassengerPhone(booking),
          companyName: getCompanyName(booking),
          routeLabel: getRouteLabel(booking),
          country,
          currency,
          createdAt: booking.createdAt,
          dueAt: booking.expiresAt,
          raw: booking
        })
      );
    }

    if (status === "CANCELLED" || status === "CANCELED") {
      incidents.push(
        buildIncident({
          source: "Reservas",
          type: "RESERVA_CANCELADA",
          severity: "info",
          status,
          title: "Reserva cancelada",
          description: `A reserva ${reference} foi cancelada.`,
          recommendation: "Verificar se o assento foi liberado e se o passageiro precisa de nova compra.",
          reference,
          entityId: getId(booking),
          passengerName: getPassengerName(booking),
          passengerPhone: getPassengerPhone(booking),
          companyName: getCompanyName(booking),
          routeLabel: getRouteLabel(booking),
          country,
          currency,
          createdAt: booking.cancelledAt || booking.updatedAt || booking.createdAt,
          dueAt: booking.expiresAt,
          raw: booking
        })
      );
    }
  });

  return incidents;
}

function buildPaymentIncidents(payments = []) {
  const incidents = [];

  payments.forEach((payment) => {
    const status = normalizeStatus(payment.status);
    const currency = getCurrency(payment);
    const country = getCountryByCurrency(currency);
    const reference = getPaymentCode(payment);

    if (status === "FAILED") {
      incidents.push(
        buildIncident({
          source: "Pagamentos",
          type: "PAGAMENTO_FALHOU",
          severity: "critical",
          status,
          title: "Pagamento com falha",
          description: `O pagamento ${reference} falhou.`,
          recommendation: "Solicitar novo pagamento ou orientar o passageiro a tentar outro método.",
          reference,
          entityId: getId(payment),
          passengerName: getPassengerName(payment),
          passengerPhone: getPassengerPhone(payment),
          companyName: getCompanyName(payment),
          routeLabel: getRouteLabel(payment),
          country,
          currency,
          createdAt: payment.failedAt || payment.updatedAt || payment.createdAt,
          dueAt: payment.expiresAt,
          raw: payment
        })
      );
    }

    if (status === "EXPIRED") {
      incidents.push(
        buildIncident({
          source: "Pagamentos",
          type: "PAGAMENTO_EXPIRADO",
          severity: "warning",
          status,
          title: "Pagamento expirado",
          description: `O pagamento ${reference} expirou.`,
          recommendation: "Criar novo pagamento se a reserva ainda estiver válida.",
          reference,
          entityId: getId(payment),
          passengerName: getPassengerName(payment),
          passengerPhone: getPassengerPhone(payment),
          companyName: getCompanyName(payment),
          routeLabel: getRouteLabel(payment),
          country,
          currency,
          createdAt: payment.updatedAt || payment.expiresAt || payment.createdAt,
          dueAt: payment.expiresAt,
          raw: payment
        })
      );
    }

    if (status === "PENDING" && isPast(payment.expiresAt)) {
      incidents.push(
        buildIncident({
          source: "Pagamentos",
          type: "PAGAMENTO_PENDENTE_VENCIDO",
          severity: "critical",
          status,
          title: "Pagamento pendente vencido",
          description: `O pagamento ${reference} segue pendente após o vencimento.`,
          recommendation: "Expirar o pagamento ou confirmar manualmente se houve recebimento.",
          reference,
          entityId: getId(payment),
          passengerName: getPassengerName(payment),
          passengerPhone: getPassengerPhone(payment),
          companyName: getCompanyName(payment),
          routeLabel: getRouteLabel(payment),
          country,
          currency,
          createdAt: payment.createdAt,
          dueAt: payment.expiresAt,
          raw: payment
        })
      );
    }
  });

  return incidents;
}

function buildTicketIncidents(tickets = []) {
  const incidents = [];

  tickets.forEach((ticket) => {
    const status = normalizeStatus(ticket.status);
    const currency = getCurrency(ticket);
    const country = getCountryByCurrency(currency);
    const reference = getTicketCode(ticket);

    if (status === "CANCELLED" || status === "CANCELED") {
      incidents.push(
        buildIncident({
          source: "Bilhetes",
          type: "BILHETE_CANCELADO",
          severity: "info",
          status,
          title: "Bilhete cancelado",
          description: `O bilhete ${reference} foi cancelado.`,
          recommendation: "Confirmar se o passageiro recebeu orientação e se precisa de reemissão.",
          reference,
          entityId: getId(ticket),
          passengerName: getPassengerName(ticket),
          passengerPhone: getPassengerPhone(ticket),
          companyName: getCompanyName(ticket),
          routeLabel: getRouteLabel(ticket),
          country,
          currency,
          createdAt: ticket.cancelledAt || ticket.updatedAt || ticket.createdAt,
          dueAt: ticket.departureAt,
          raw: ticket
        })
      );
    }

    if (status === "VALID" && ticket.departureAt && isPast(ticket.departureAt) && !ticket.usedAt) {
      incidents.push(
        buildIncident({
          source: "Bilhetes",
          type: "BILHETE_VALIDO_APOS_PARTIDA",
          severity: "warning",
          status,
          title: "Bilhete válido após horário da viagem",
          description: `O bilhete ${reference} segue válido mesmo após a partida.`,
          recommendation: "Verificar se houve embarque não registrado ou marcar como usado/cancelado.",
          reference,
          entityId: getId(ticket),
          passengerName: getPassengerName(ticket),
          passengerPhone: getPassengerPhone(ticket),
          companyName: getCompanyName(ticket),
          routeLabel: getRouteLabel(ticket),
          country,
          currency,
          createdAt: ticket.issuedAt || ticket.createdAt,
          dueAt: ticket.departureAt,
          raw: ticket
        })
      );
    }
  });

  return incidents;
}

function buildWhatsAppIncidents(messages = []) {
  const incidents = [];

  messages.forEach((message) => {
    const status = normalizeStatus(message.status);
    const ageMinutes = minutesSince(message.createdAt);
    const reference = message.referenceCode || getId(message);

    if (status === "FAILED") {
      incidents.push(
        buildIncident({
          source: "WhatsApp",
          type: "WHATSAPP_FALHOU",
          severity: "critical",
          status,
          title: "Mensagem WhatsApp falhou",
          description: `A mensagem ${reference} falhou no envio.`,
          recommendation: "Tentar reenviar ou contactar o passageiro por outro canal.",
          reference,
          entityId: getId(message),
          passengerName: getPassengerName(message),
          passengerPhone: getPassengerPhone(message),
          companyName: message.providerName || "WHATSAPP_SIMULADO",
          routeLabel: "-",
          country: "-",
          currency: "-",
          createdAt: message.failedAt || message.updatedAt || message.createdAt,
          dueAt: null,
          raw: message
        })
      );
    }

    if (status === "PENDING" && ageMinutes !== null && ageMinutes >= 30) {
      incidents.push(
        buildIncident({
          source: "WhatsApp",
          type: "WHATSAPP_PENDENTE_ANTIGO",
          severity: "warning",
          status,
          title: "Mensagem pendente há mais de 30 minutos",
          description: `A mensagem ${reference} ainda está pendente.`,
          recommendation: "Marcar como enviada/falha ou reenviar quando houver integração real.",
          reference,
          entityId: getId(message),
          passengerName: getPassengerName(message),
          passengerPhone: getPassengerPhone(message),
          companyName: message.providerName || "WHATSAPP_SIMULADO",
          routeLabel: "-",
          country: "-",
          currency: "-",
          createdAt: message.createdAt,
          dueAt: null,
          raw: message
        })
      );
    }
  });

  return incidents;
}

export async function getOperationalIncidents() {
  const [bookingsResult, paymentsResult, ticketsResult, whatsappResult] =
    await Promise.allSettled([
      listBookings(),
      listPayments(),
      listTickets(),
      listWhatsAppMessages()
    ]);

  const bookings = bookingsResult.status === "fulfilled" ? bookingsResult.value : [];
  const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : [];
  const tickets = ticketsResult.status === "fulfilled" ? ticketsResult.value : [];
  const whatsapp = whatsappResult.status === "fulfilled" ? whatsappResult.value : [];

  const incidents = [
    ...buildBookingIncidents(bookings),
    ...buildPaymentIncidents(payments),
    ...buildTicketIncidents(tickets),
    ...buildWhatsAppIncidents(whatsapp)
  ].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.dueAt || 0).getTime();
    const bDate = new Date(b.createdAt || b.dueAt || 0).getTime();
    const severityWeight = {
      critical: 4,
      warning: 3,
      info: 2,
      resolved: 1
    };

    const severityDiff =
      (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);

    if (severityDiff !== 0) {
      return severityDiff;
    }

    return bDate - aDate;
  });

  return {
    incidents,
    raw: {
      bookings,
      payments,
      tickets,
      whatsapp
    },
    errors: {
      bookings: bookingsResult.status === "rejected" ? bookingsResult.reason : null,
      payments: paymentsResult.status === "rejected" ? paymentsResult.reason : null,
      tickets: ticketsResult.status === "rejected" ? ticketsResult.reason : null,
      whatsapp: whatsappResult.status === "rejected" ? whatsappResult.reason : null
    }
  };
}
