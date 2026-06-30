import { listBookings } from "./bookings";
import { listPayments } from "./payments";
import { listPassengers } from "./passengers";
import { listTickets } from "./tickets";
import { listWhatsAppMessages } from "./whatsapp";

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function getId(item) {
  return item?.id || item?.bookingId || item?.paymentId || item?.ticketId || "";
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

function pushEvent(events, event) {
  if (!event.date) {
    return;
  }

  events.push({
    id: `${event.module}-${event.action}-${event.entityId || event.reference || Math.random()}-${event.date}`,
    ...event
  });
}

function buildBookingEvents(bookings = []) {
  const events = [];

  bookings.forEach((booking) => {
    const status = normalizeStatus(booking.status);
    const reference = booking.bookingCode || getId(booking);
    const amount = booking.amount || booking.totalAmount || booking.price || 0;
    const currency = booking.currency || "BRL";

    pushEvent(events, {
      module: "Reservas",
      action: "Reserva criada",
      status: status || "CREATED",
      level: "info",
      actor: "WhatsApp / Operação",
      reference,
      entityId: getId(booking),
      passengerName: getPassengerName(booking),
      companyName: getCompanyName(booking),
      routeLabel: getRouteLabel(booking),
      date: booking.createdAt,
      description: `Reserva ${reference} criada para ${getPassengerName(booking)}.`,
      details: `${currency} ${amount} · Assento ${booking.seatNumber || "-"}`
    });

    if (booking.paidAt) {
      pushEvent(events, {
        module: "Reservas",
        action: "Pagamento confirmado",
        status: "PAID",
        level: "success",
        actor: "Backoffice",
        reference,
        entityId: getId(booking),
        passengerName: getPassengerName(booking),
        companyName: getCompanyName(booking),
        routeLabel: getRouteLabel(booking),
        date: booking.paidAt,
        description: `Pagamento da reserva ${reference} confirmado.`,
        details: `${currency} ${amount}`
      });
    }

    if (booking.cancelledAt) {
      pushEvent(events, {
        module: "Reservas",
        action: "Reserva cancelada",
        status: "CANCELLED",
        level: "danger",
        actor: "Backoffice",
        reference,
        entityId: getId(booking),
        passengerName: getPassengerName(booking),
        companyName: getCompanyName(booking),
        routeLabel: getRouteLabel(booking),
        date: booking.cancelledAt,
        description: `Reserva ${reference} cancelada.`,
        details: `Assento ${booking.seatNumber || "-"} liberado quando aplicável.`
      });
    }

    if (booking.expiresAt && status === "EXPIRED") {
      pushEvent(events, {
        module: "Reservas",
        action: "Reserva expirada",
        status: "EXPIRED",
        level: "warning",
        actor: "Sistema",
        reference,
        entityId: getId(booking),
        passengerName: getPassengerName(booking),
        companyName: getCompanyName(booking),
        routeLabel: getRouteLabel(booking),
        date: booking.expiresAt,
        description: `Reserva ${reference} expirou por falta de pagamento.`,
        details: `Assento ${booking.seatNumber || "-"}`
      });
    }
  });

  return events;
}

function buildPaymentEvents(payments = []) {
  const events = [];

  payments.forEach((payment) => {
    const status = normalizeStatus(payment.status);
    const reference = getPaymentCode(payment);
    const amount = payment.amount || payment.totalAmount || payment.price || 0;
    const currency = payment.currency || "BRL";

    pushEvent(events, {
      module: "Pagamentos",
      action: "Pagamento criado",
      status: status || "CREATED",
      level: status === "PAID" ? "success" : "info",
      actor: "Sistema / Operação",
      reference,
      entityId: getId(payment),
      passengerName: getPassengerName(payment),
      companyName: getCompanyName(payment),
      routeLabel: getRouteLabel(payment),
      date: payment.createdAt,
      description: `Pagamento ${reference} criado para a reserva ${getBookingCode(payment)}.`,
      details: `${payment.method || "-"} · ${currency} ${amount}`
    });

    if (payment.paidAt) {
      pushEvent(events, {
        module: "Pagamentos",
        action: "Pagamento confirmado",
        status: "PAID",
        level: "success",
        actor: "Backoffice",
        reference,
        entityId: getId(payment),
        passengerName: getPassengerName(payment),
        companyName: getCompanyName(payment),
        routeLabel: getRouteLabel(payment),
        date: payment.paidAt,
        description: `Pagamento ${reference} confirmado.`,
        details: `${payment.method || "-"} · ${currency} ${amount}`
      });
    }

    if (payment.cancelledAt) {
      pushEvent(events, {
        module: "Pagamentos",
        action: "Pagamento cancelado",
        status: "CANCELLED",
        level: "danger",
        actor: "Backoffice",
        reference,
        entityId: getId(payment),
        passengerName: getPassengerName(payment),
        companyName: getCompanyName(payment),
        routeLabel: getRouteLabel(payment),
        date: payment.cancelledAt,
        description: `Pagamento ${reference} cancelado.`,
        details: payment.method || "-"
      });
    }

    if (payment.expiresAt && status === "EXPIRED") {
      pushEvent(events, {
        module: "Pagamentos",
        action: "Pagamento expirado",
        status: "EXPIRED",
        level: "warning",
        actor: "Sistema",
        reference,
        entityId: getId(payment),
        passengerName: getPassengerName(payment),
        companyName: getCompanyName(payment),
        routeLabel: getRouteLabel(payment),
        date: payment.expiresAt,
        description: `Pagamento ${reference} expirou.`,
        details: payment.method || "-"
      });
    }
  });

  return events;
}

function buildTicketEvents(tickets = []) {
  const events = [];

  tickets.forEach((ticket) => {
    const status = normalizeStatus(ticket.status);
    const reference = getTicketCode(ticket);
    const amount = ticket.amount || ticket.totalAmount || ticket.price || 0;
    const currency = ticket.currency || "BRL";

    pushEvent(events, {
      module: "Bilhetes",
      action: "Bilhete emitido",
      status: status || "ISSUED",
      level: status === "CANCELLED" ? "danger" : "success",
      actor: "Sistema / Backoffice",
      reference,
      entityId: getId(ticket),
      passengerName: getPassengerName(ticket),
      companyName: getCompanyName(ticket),
      routeLabel: getRouteLabel(ticket),
      date: ticket.issuedAt || ticket.createdAt,
      description: `Bilhete ${reference} emitido para ${getPassengerName(ticket)}.`,
      details: `${currency} ${amount} · Assento ${ticket.seatNumber || "-"}`
    });

    if (ticket.usedAt) {
      pushEvent(events, {
        module: "Bilhetes",
        action: "Bilhete usado no embarque",
        status: "USED",
        level: "success",
        actor: "Fiscal / Operador",
        reference,
        entityId: getId(ticket),
        passengerName: getPassengerName(ticket),
        companyName: getCompanyName(ticket),
        routeLabel: getRouteLabel(ticket),
        date: ticket.usedAt,
        description: `Bilhete ${reference} utilizado no embarque.`,
        details: `Assento ${ticket.seatNumber || "-"}`
      });
    }

    if (ticket.cancelledAt) {
      pushEvent(events, {
        module: "Bilhetes",
        action: "Bilhete cancelado",
        status: "CANCELLED",
        level: "danger",
        actor: "Backoffice",
        reference,
        entityId: getId(ticket),
        passengerName: getPassengerName(ticket),
        companyName: getCompanyName(ticket),
        routeLabel: getRouteLabel(ticket),
        date: ticket.cancelledAt,
        description: `Bilhete ${reference} cancelado.`,
        details: `Reserva ${getBookingCode(ticket)}`
      });
    }
  });

  return events;
}

function buildPassengerEvents(passengers = []) {
  const events = [];

  passengers.forEach((passenger) => {
    const reference = passenger.documentNumber || passenger.id || getPassengerName(passenger);

    pushEvent(events, {
      module: "Passageiros",
      action: "Passageiro cadastrado",
      status: "CREATED",
      level: "info",
      actor: "Backoffice / WhatsApp",
      reference,
      entityId: getId(passenger),
      passengerName: getPassengerName(passenger),
      companyName: "Sistema",
      routeLabel: "-",
      date: passenger.createdAt,
      description: `Passageiro ${getPassengerName(passenger)} cadastrado.`,
      details: `Documento ${passenger.documentNumber || "-"}`
    });

    if (passenger.updatedAt && passenger.updatedAt !== passenger.createdAt) {
      pushEvent(events, {
        module: "Passageiros",
        action: "Passageiro atualizado",
        status: "UPDATED",
        level: "info",
        actor: "Backoffice",
        reference,
        entityId: getId(passenger),
        passengerName: getPassengerName(passenger),
        companyName: "Sistema",
        routeLabel: "-",
        date: passenger.updatedAt,
        description: `Cadastro do passageiro ${getPassengerName(passenger)} atualizado.`,
        details: `WhatsApp ${passenger.whatsapp || "-"}`
      });
    }
  });

  return events;
}

function buildWhatsAppEvents(messages = []) {
  const events = [];

  messages.forEach((message) => {
    const status = normalizeStatus(message.status);
    const reference = message.referenceCode || message.id;

    pushEvent(events, {
      module: "WhatsApp",
      action: "Mensagem criada",
      status: status || "CREATED",
      level: status === "FAILED" ? "danger" : status === "SENT" ? "success" : "info",
      actor: "WhatsApp simulado",
      reference,
      entityId: getId(message),
      passengerName: getPassengerName(message),
      companyName: message.providerName || "WHATSAPP_SIMULADO",
      routeLabel: "-",
      date: message.createdAt,
      description: `Mensagem ${message.messageType || "-"} criada para ${message.toPhone || "-"}.`,
      details: `Status ${status || "-"}`
    });

    if (message.sentAt) {
      pushEvent(events, {
        module: "WhatsApp",
        action: "Mensagem enviada",
        status: "SENT",
        level: "success",
        actor: "WhatsApp simulado",
        reference,
        entityId: getId(message),
        passengerName: getPassengerName(message),
        companyName: message.providerName || "WHATSAPP_SIMULADO",
        routeLabel: "-",
        date: message.sentAt,
        description: `Mensagem ${reference} marcada como enviada.`,
        details: message.providerMessageId || "-"
      });
    }

    if (message.failedAt) {
      pushEvent(events, {
        module: "WhatsApp",
        action: "Mensagem falhou",
        status: "FAILED",
        level: "danger",
        actor: "WhatsApp simulado",
        reference,
        entityId: getId(message),
        passengerName: getPassengerName(message),
        companyName: message.providerName || "WHATSAPP_SIMULADO",
        routeLabel: "-",
        date: message.failedAt,
        description: `Mensagem ${reference} marcada como falha.`,
        details: message.errorMessage || "-"
      });
    }
  });

  return events;
}

export async function getAuditOverview() {
  const [bookingsResult, paymentsResult, ticketsResult, passengersResult, whatsappResult] =
    await Promise.allSettled([
      listBookings(),
      listPayments(),
      listTickets(),
      listPassengers(),
      listWhatsAppMessages()
    ]);

  const bookings = bookingsResult.status === "fulfilled" ? bookingsResult.value : [];
  const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : [];
  const tickets = ticketsResult.status === "fulfilled" ? ticketsResult.value : [];
  const passengers = passengersResult.status === "fulfilled" ? passengersResult.value : [];
  const whatsapp = whatsappResult.status === "fulfilled" ? whatsappResult.value : [];

  const events = [
    ...buildBookingEvents(bookings),
    ...buildPaymentEvents(payments),
    ...buildTicketEvents(tickets),
    ...buildPassengerEvents(passengers),
    ...buildWhatsAppEvents(whatsapp)
  ]
    .filter((event) => event.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    events,
    raw: {
      bookings,
      payments,
      tickets,
      passengers,
      whatsapp
    },
    errors: {
      bookings: bookingsResult.status === "rejected" ? bookingsResult.reason : null,
      payments: paymentsResult.status === "rejected" ? paymentsResult.reason : null,
      tickets: ticketsResult.status === "rejected" ? ticketsResult.reason : null,
      passengers: passengersResult.status === "rejected" ? passengersResult.reason : null,
      whatsapp: whatsappResult.status === "rejected" ? whatsappResult.reason : null
    }
  };
}
