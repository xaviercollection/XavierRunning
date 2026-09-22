// Validação server-side do formulário de movimentação financeira. Espelha os CHECKs do banco
// (que continuam sendo a barreira final), mas devolve mensagens legíveis. Sem imports em
// runtime (só tipos) — testável direto no Node, como lib/store/validation.ts.

import type { TransactionInput, TransactionStatus, TransactionType } from "./types";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = (error: string): Parsed<never> => ({ ok: false, error });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const TRANSACTION_TYPES: readonly TransactionType[] = ["sale", "income", "expense"];
export const TRANSACTION_STATUSES: readonly TransactionStatus[] = ["paid", "pending"];
/** Lista sugerida no seletor do admin — "Outro" cobre o que não está na lista. */
export const PAYMENT_METHODS: readonly string[] = ["PIX", "Dinheiro", "Cartão", "Transferência", "Boleto", "Outro"];

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function readText(raw: unknown, label: string, max: number, required: boolean): Parsed<string> {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (required && value.length === 0) return fail(`Informe o campo "${label}".`);
  if (value.length > max) return fail(`O campo "${label}" excede ${max} caracteres.`);
  return ok(value);
}

function readNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function parseTransactionInput(raw: unknown): Parsed<TransactionInput> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("Dados da movimentação inválidos.");
  const input = raw as Record<string, unknown>;

  let id: string | undefined;
  if (input.id !== undefined && input.id !== null && input.id !== "") {
    if (!isUuid(input.id)) return fail("Identificador da movimentação inválido.");
    id = input.id;
  }

  if (!TRANSACTION_TYPES.includes(input.type as TransactionType)) return fail("Selecione o tipo da movimentação.");
  const type = input.type as TransactionType;

  const description = readText(input.description, "Descrição", 200, true);
  if (!description.ok) return description;

  const amountValue = readNumber(input.amount);
  if (amountValue === null || amountValue <= 0 || amountValue >= 10_000_000) {
    return fail("Informe um valor válido, maior que zero.");
  }
  const amount = round2(amountValue);

  if (!TRANSACTION_STATUSES.includes(input.status as TransactionStatus)) return fail("Selecione o status da movimentação.");
  const status = input.status as TransactionStatus;

  const transactionDate = typeof input.transactionDate === "string" ? input.transactionDate.trim() : "";
  if (!isValidDateString(transactionDate)) return fail("Informe uma data de movimentação válida.");

  let dueDate: string | null = null;
  if (input.dueDate !== undefined && input.dueDate !== null && input.dueDate !== "") {
    const value = typeof input.dueDate === "string" ? input.dueDate.trim() : "";
    if (!isValidDateString(value)) return fail("Informe uma data de vencimento válida.");
    dueDate = value;
  }

  const paymentMethod = readText(input.paymentMethod, "Forma de pagamento", 40, false);
  if (!paymentMethod.ok) return paymentMethod;

  const notes = readText(input.notes, "Observações", 1000, false);
  if (!notes.ok) return notes;

  return ok({
    id,
    type,
    description: description.value,
    amount,
    status,
    transactionDate,
    dueDate,
    paymentMethod: paymentMethod.value || null,
    notes: notes.value || null,
  });
}

/** Colunas graváveis (create e update usam o mesmo shape; `id` nunca é gravado por aqui). */
export function toTransactionRow(input: TransactionInput) {
  return {
    type: input.type,
    description: input.description,
    amount: input.amount,
    status: input.status,
    transaction_date: input.transactionDate,
    due_date: input.dueDate ?? null,
    payment_method: input.paymentMethod ?? null,
    notes: input.notes ?? null,
  };
}
