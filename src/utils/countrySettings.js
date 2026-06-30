export const COUNTRY_SETTINGS = [
  {
    id: "angola",
    country: "Angola",
    flag: "🇦🇴",
    currency: "AOA",
    currencyName: "Kwanza",
    documentTypes: ["BI", "Passaporte"],
    paymentMethods: ["Multicaixa Express", "Unitel Money", "Afrimoney", "Dinheiro"],
    defaultLanguage: "pt-AO",
    phonePrefix: "+244",
    cities: [
      "Luanda",
      "Benguela",
      "Huambo",
      "Lubango",
      "Malanje",
      "Namibe",
      "Cabinda",
      "Uíge",
      "Saurimo",
      "Lobito",
      "Cuito",
      "Menongue"
    ],
    examples: [
      "Luanda > Benguela 26/06/2026",
      "Huambo > Lubango 10/07/2026",
      "Cabinda > Luanda 15/08/2026"
    ],
    notes: [
      "Documento principal: BI angolano ou Passaporte.",
      "Moeda operacional: AOA.",
      "Pagamentos prioritários: Multicaixa Express, Unitel Money e Afrimoney.",
      "O país deve ser identificado pela cidade de origem/destino, não pelo número do telefone."
    ]
  },
  {
    id: "brasil",
    country: "Brasil",
    flag: "🇧🇷",
    currency: "BRL",
    currencyName: "Real",
    documentTypes: ["CPF", "Passaporte"],
    paymentMethods: ["Pix", "Dinheiro"],
    defaultLanguage: "pt-BR",
    phonePrefix: "+55",
    cities: [
      "São Paulo",
      "Rio de Janeiro",
      "Campinas",
      "Belo Horizonte",
      "Curitiba",
      "Brasília",
      "Goiânia",
      "Salvador",
      "Recife",
      "Porto Alegre",
      "Florianópolis",
      "Santos"
    ],
    examples: [
      "São Paulo > Rio de Janeiro 26/06/2026",
      "Campinas > Curitiba 10/07/2026",
      "Brasília > Goiânia 15/08/2026"
    ],
    notes: [
      "Documento principal: CPF ou Passaporte.",
      "Moeda operacional: BRL.",
      "Pagamento prioritário: Pix.",
      "O país deve ser identificado pela cidade de origem/destino, não pelo número do telefone."
    ]
  }
];

export function normalizeCityName(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function detectCountryByCity(cityName) {
  const normalizedCity = normalizeCityName(cityName);

  if (!normalizedCity) {
    return null;
  }

  return (
    COUNTRY_SETTINGS.find((country) =>
      country.cities.some((city) => normalizeCityName(city) === normalizedCity)
    ) || null
  );
}

export function detectCountryByRouteText(routeText) {
  const normalizedRoute = normalizeCityName(routeText);

  if (!normalizedRoute) {
    return null;
  }

  return (
    COUNTRY_SETTINGS.find((country) =>
      country.cities.some((city) => normalizedRoute.includes(normalizeCityName(city)))
    ) || null
  );
}
