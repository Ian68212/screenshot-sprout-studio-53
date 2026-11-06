export type QuoteData = {
  name: string;
  company?: string;
  phone: string;
  email?: string;
  service?: string;
  message: string;
};

export function buildQuoteMessage(d: QuoteData): string {
  const lines = [
    "Olá, Rodrinox Pro! Gostaria de solicitar um orçamento.",
    `Nome: ${d.name}`,
    d.company ? `Empresa: ${d.company}` : null,
    `Telefone: ${d.phone}`,
    d.email ? `E-mail: ${d.email}` : null,
    d.service ? `Serviço: ${d.service}` : null,
    `Mensagem: ${d.message}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function whatsappUrl(number: string, text?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
