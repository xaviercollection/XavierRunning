// Checkout por WhatsApp. A venda NÃO é registrada em lugar nenhum e o estoque NÃO é tocado:
// este módulo só monta o texto do pedido e a URL wa.me. Sem imports de propósito (testável no Node).

/** Número da loja (E.164, só dígitos): +55 (83) 8893-3979. Usado se a configuração estiver vazia/inválida. */
export const DEFAULT_WHATSAPP_E164 = "558388933979";

export interface WhatsAppLine {
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  /** ml, quando o produto tiver volume cadastrado (ex.: perfumes). */
  volumeMl?: number;
  /** Tamanho escolhido pelo cliente, quando o produto tiver mais de um. */
  size?: string;
  /** Cor escolhida pelo cliente, quando o produto tiver mais de uma. */
  color?: string;
}

/** Só emite a linha do atributo quando ele existir — nunca "Tamanho:"/"Cor:"/"Volume:" vazios. */
function attributeLines(line: WhatsAppLine, indent: string): string[] {
  const lines: string[] = [];
  if (line.volumeMl != null) lines.push(`${indent}Volume: ${line.volumeMl}ml`);
  if (line.size) lines.push(`${indent}Tamanho: ${line.size}`);
  if (line.color) lines.push(`${indent}Cor: ${line.color}`);
  return lines;
}

function compactAttributes(line: WhatsAppLine): string {
  const attrs = [
    line.volumeMl != null ? `${line.volumeMl}ml` : null,
    line.size ?? null,
    line.color ?? null,
  ].filter((value): value is string => Boolean(value));
  return attrs.length > 0 ? ` (${attrs.join(" · ")})` : "";
}

/** Normaliza o texto digitado no painel para dígitos E.164 (adiciona 55 a números nacionais). */
export function whatsappDigits(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return digits;
  return null;
}

export function resolveWhatsappNumber(configured?: string | null): string {
  return (configured ? whatsappDigits(configured) : null) ?? DEFAULT_WHATSAPP_E164;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(cents / 100)
    .replace(/ /g, " ");
}

const toCents = (price: number) => Math.round(price * 100);

export function cartTotalCents(lines: WhatsAppLine[]): number {
  return lines.reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0);
}

export function buildWhatsAppMessage(lines: WhatsAppLine[], options: { compact?: boolean } = {}): string {
  const total = formatCents(cartTotalCents(lines));

  if (options.compact) {
    const items = lines.map((line, index) => {
      const subtotal = formatCents(toCents(line.unitPrice) * line.quantity);
      return `${index + 1}) ${line.name} (${line.brand})${compactAttributes(line)} x${line.quantity} = ${subtotal}`;
    });
    return [
      "Olá, Xavier Collection! Quero finalizar este pedido:",
      ...items,
      `Total estimado: ${total}`,
      "Podem confirmar disponibilidade, frete e forma de pagamento?",
    ].join("\n");
  }

  const items = lines.map((line, index) => {
    const subtotal = formatCents(toCents(line.unitPrice) * line.quantity);
    return [
      `${index + 1}. ${line.name} — ${line.brand}`,
      ...attributeLines(line, "   "),
      `   ${line.quantity} × ${formatCents(toCents(line.unitPrice))} = ${subtotal}`,
    ].join("\n");
  });

  return [
    "Olá, Xavier Collection! Quero finalizar este pedido:",
    "",
    items.join("\n\n"),
    "",
    `Total estimado: ${total}`,
    "",
    "Podem confirmar disponibilidade, frete e forma de pagamento?",
  ].join("\n");
}

// URLs muito longas podem ser truncadas pelo WhatsApp e o total (no fim) se perderia.
// Acima deste limite usamos o formato compacto, que cabe com folga em sacolas grandes.
const MAX_ENCODED_MESSAGE_LENGTH = 3500;

export function buildWhatsAppUrl(phoneE164: string, lines: WhatsAppLine[]): string {
  let message = buildWhatsAppMessage(lines);
  if (encodeURIComponent(message).length > MAX_ENCODED_MESSAGE_LENGTH) {
    message = buildWhatsAppMessage(lines, { compact: true });
  }
  return `https://wa.me/${phoneE164}?text=${encodeURIComponent(message)}`;
}
