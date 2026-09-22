// Lógica pura do dashboard financeiro (indicadores + gráfico). Sem imports em runtime (só
// tipos) — testável direto no Node, como lib/store/cart.ts e lib/store/whatsapp.ts.
//
// Regra de período (documentada aqui porque afeta todo o cálculo):
//   - Faturamento, Resultado, Ticket médio e o gráfico SÃO cortados pelo filtro 7/30/90 dias:
//     representam "como a loja foi no período".
//   - Saldo disponível é o caixa REAL acumulado (todas as movimentações pagas, qualquer data) —
//     não faz sentido "zerar" o caixa da loja só porque o filtro mudou para 7 dias.
//   - A receber / A pagar representam compromissos ATUAIS (pendências em aberto agora), também
//     sem corte de período — são "o que falta liquidar hoje", não "o que venceu nos últimos N
//     dias". Saldo projetado soma esses três.

import type { FinanceTransaction } from "./types";

const toCents = (amount: number) => Math.round(amount * 100);

function sumCents(transactions: Array<Pick<FinanceTransaction, "amount">>): number {
  return transactions.reduce((total, t) => total + toCents(t.amount), 0);
}

/** "YYYY-MM-DD" -> Date à meia-noite LOCAL (uma data UTC "nua" empurraria pro dia anterior em fusos negativos). */
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Data de competência dentro dos últimos `periodDays` dias, incluindo hoje. */
export function isWithinPeriod(transactionDate: string, periodDays: number, now: Date = new Date()): boolean {
  const today = startOfDay(now);
  const cutoff = addDays(today, -(periodDays - 1));
  const date = parseLocalDate(transactionDate);
  return date >= cutoff && date <= today;
}

const isPaidSale = (t: FinanceTransaction) => t.type === "sale" && t.status === "paid";
const isPaidIncome = (t: FinanceTransaction) => t.type === "income" && t.status === "paid";
const isPaidExpense = (t: FinanceTransaction) => t.type === "expense" && t.status === "paid";
const isPendingReceivable = (t: FinanceTransaction) => (t.type === "sale" || t.type === "income") && t.status === "pending";
const isPendingPayable = (t: FinanceTransaction) => t.type === "expense" && t.status === "pending";

export interface FinanceSummary {
  revenue: number;
  result: number;
  ticketAverage: number;
  salesCount: number;
  availableBalance: number;
  receivable: number;
  payable: number;
  projectedBalance: number;
}

export function computeFinanceSummary(
  transactions: FinanceTransaction[],
  periodDays: number,
  now: Date = new Date(),
): FinanceSummary {
  const inPeriod = transactions.filter((t) => isWithinPeriod(t.transactionDate, periodDays, now));

  const paidSalesInPeriod = inPeriod.filter(isPaidSale);
  const revenueCents = sumCents(paidSalesInPeriod);
  const resultCents = revenueCents + sumCents(inPeriod.filter(isPaidIncome)) - sumCents(inPeriod.filter(isPaidExpense));
  const salesCount = paidSalesInPeriod.length;
  const ticketAverageCents = salesCount > 0 ? Math.round(revenueCents / salesCount) : 0;

  const availableBalanceCents =
    sumCents(transactions.filter(isPaidSale)) +
    sumCents(transactions.filter(isPaidIncome)) -
    sumCents(transactions.filter(isPaidExpense));
  const receivableCents = sumCents(transactions.filter(isPendingReceivable));
  const payableCents = sumCents(transactions.filter(isPendingPayable));

  return {
    revenue: revenueCents / 100,
    result: resultCents / 100,
    ticketAverage: ticketAverageCents / 100,
    salesCount,
    availableBalance: availableBalanceCents / 100,
    receivable: receivableCents / 100,
    payable: payableCents / 100,
    projectedBalance: (availableBalanceCents + receivableCents - payableCents) / 100,
  };
}

export interface ChartBucket {
  label: string;
  total: number;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function bucketLabel(start: Date, end: Date, bucketSizeDays: number): string {
  if (bucketSizeDays === 1) return WEEKDAY_LABELS[start.getDay()];
  const fmt = (d: Date) => String(d.getDate()).padStart(2, "0");
  return start.getTime() === end.getTime() ? fmt(start) : `${fmt(start)}–${fmt(end)}`;
}

/**
 * Vendas pagas agrupadas por dia (período de 7 dias) ou por semana (30/90 dias — senão seriam
 * 30/90 barras). Vem só de movimentações reais; sem dado, o bucket fica com total 0 (o
 * componente decide como mostrar o estado vazio).
 */
export function computeSalesChart(
  transactions: FinanceTransaction[],
  periodDays: number,
  now: Date = new Date(),
): ChartBucket[] {
  const paidSales = transactions.filter(isPaidSale);
  const today = startOfDay(now);
  const start = addDays(today, -(periodDays - 1));
  const bucketSizeDays = periodDays <= 7 ? 1 : 7;

  const buckets: ChartBucket[] = [];
  for (let bucketStart = start; bucketStart <= today; bucketStart = addDays(bucketStart, bucketSizeDays)) {
    const bucketEndRaw = addDays(bucketStart, bucketSizeDays - 1);
    const bucketEnd = bucketEndRaw > today ? today : bucketEndRaw;
    const totalCents = sumCents(
      paidSales.filter((t) => {
        const date = parseLocalDate(t.transactionDate);
        return date >= bucketStart && date <= bucketEnd;
      }),
    );
    buckets.push({ label: bucketLabel(bucketStart, bucketEnd, bucketSizeDays), total: totalCents / 100 });
  }
  return buckets;
}
