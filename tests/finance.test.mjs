// Testes unitários do financeiro (npm test). Cobrem: cálculo dos indicadores, gráfico,
// validação de entrada, mapeador e exportação CSV — tudo lib/finance/, sem Supabase.

import assert from "node:assert/strict";
import test from "node:test";
import { computeFinanceSummary, computeSalesChart, isWithinPeriod, parseLocalDate } from "../lib/finance/calculations.ts";
import { transactionsToCsv, financeCsvFilename } from "../lib/finance/csv.ts";
import { toFinanceTransaction } from "../lib/finance/mappers.ts";
import { isUuid, parseTransactionInput, toTransactionRow } from "../lib/finance/validation.ts";

const ID = "11111111-1111-4111-8111-111111111111";
const TODAY = new Date(2026, 8, 22); // 22 de setembro de 2026 (mês 0-indexado)
const isoDaysAgo = (days) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const tx = (overrides = {}) => ({
  id: overrides.id ?? ID,
  type: "sale",
  description: "Venda de teste",
  amount: 100,
  status: "paid",
  transactionDate: isoDaysAgo(0),
  dueDate: undefined,
  paymentMethod: undefined,
  notes: undefined,
  createdAt: "2026-09-22T10:00:00.000Z",
  updatedAt: "2026-09-22T10:00:00.000Z",
  ...overrides,
});

// ---------------------------------------------------------------- computeFinanceSummary
test("venda paga: soma faturamento, resultado, saldo disponível e entra no ticket médio", () => {
  const transactions = [tx({ amount: 100 }), tx({ id: "2", amount: 200 })];
  const summary = computeFinanceSummary(transactions, 30, TODAY);
  assert.equal(summary.revenue, 300);
  assert.equal(summary.result, 300);
  assert.equal(summary.availableBalance, 300);
  assert.equal(summary.salesCount, 2);
  assert.equal(summary.ticketAverage, 150);
});

test("venda pendente: entra em 'a receber', NÃO entra no faturamento pago nem no saldo", () => {
  const transactions = [tx({ status: "pending", amount: 500 })];
  const summary = computeFinanceSummary(transactions, 30, TODAY);
  assert.equal(summary.revenue, 0, "venda pendente não é faturamento");
  assert.equal(summary.availableBalance, 0, "venda pendente não é caixa disponível");
  assert.equal(summary.receivable, 500);
  assert.equal(summary.salesCount, 0);
  assert.equal(summary.ticketAverage, 0);
});

test("entrada paga: soma resultado e saldo, mas NÃO conta como venda no ticket médio", () => {
  const transactions = [tx({ type: "income", amount: 300, description: "Aporte" })];
  const summary = computeFinanceSummary(transactions, 30, TODAY);
  assert.equal(summary.revenue, 0, "entrada não é faturamento (faturamento é só venda)");
  assert.equal(summary.result, 300);
  assert.equal(summary.availableBalance, 300);
  assert.equal(summary.salesCount, 0, "entrada não é venda");
  assert.equal(summary.ticketAverage, 0, "sem venda, ticket médio é zero, não divide por entrada");
});

test("despesa paga: reduz resultado e saldo disponível", () => {
  const transactions = [tx({ amount: 500 }), tx({ id: "2", type: "expense", amount: 120, description: "Fornecedor" })];
  const summary = computeFinanceSummary(transactions, 30, TODAY);
  assert.equal(summary.revenue, 500);
  assert.equal(summary.result, 380);
  assert.equal(summary.availableBalance, 380);
});

test("despesa pendente: entra em 'a pagar', não afeta resultado nem saldo disponível", () => {
  const transactions = [tx({ type: "expense", status: "pending", amount: 250, description: "Aluguel" })];
  const summary = computeFinanceSummary(transactions, 30, TODAY);
  assert.equal(summary.result, 0);
  assert.equal(summary.availableBalance, 0);
  assert.equal(summary.payable, 250);
});

test("saldo projetado = saldo disponível + a receber − a pagar", () => {
  const transactions = [
    tx({ amount: 1000 }), // sale paid -> saldo
    tx({ id: "2", type: "sale", status: "pending", amount: 400 }), // a receber
    tx({ id: "3", type: "expense", status: "pending", amount: 150 }), // a pagar
  ];
  const summary = computeFinanceSummary(transactions, 30, TODAY);
  assert.equal(summary.availableBalance, 1000);
  assert.equal(summary.receivable, 400);
  assert.equal(summary.payable, 150);
  assert.equal(summary.projectedBalance, 1000 + 400 - 150);
});

test("ticket médio: sem vendas pagas é R$ 0,00 e não divide por entradas/despesas", () => {
  const summary = computeFinanceSummary([tx({ type: "expense", amount: 50 })], 30, TODAY);
  assert.equal(summary.ticketAverage, 0);
  assert.equal(summary.salesCount, 0);
});

test("saldo disponível NÃO é cortado pelo filtro de período (é o caixa real acumulado)", () => {
  const oldSale = tx({ transactionDate: isoDaysAgo(200), amount: 900 });
  const summary7d = computeFinanceSummary([oldSale], 7, TODAY);
  assert.equal(summary7d.revenue, 0, "fora do período de 7 dias, não conta no faturamento do período");
  assert.equal(summary7d.availableBalance, 900, "mas continua no caixa real, independente do filtro");
});

test("filtro de período: só movimentações dentro da janela entram em faturamento/resultado/ticket", () => {
  const transactions = [
    tx({ id: "recent", transactionDate: isoDaysAgo(2), amount: 100 }),
    tx({ id: "old", transactionDate: isoDaysAgo(40), amount: 900 }),
  ];
  const summary7 = computeFinanceSummary(transactions, 7, TODAY);
  assert.equal(summary7.revenue, 100, "só a venda dentro de 7 dias entra");

  const summary30 = computeFinanceSummary(transactions, 30, TODAY);
  assert.equal(summary30.revenue, 100, "venda de 40 dias atrás ainda fica fora de 30 dias");

  const summary90 = computeFinanceSummary(transactions, 90, TODAY);
  assert.equal(summary90.revenue, 1000, "dentro de 90 dias, as duas entram");
});

test("isWithinPeriod: hoje sempre conta; período é inclusivo dos dois lados", () => {
  assert.equal(isWithinPeriod(isoDaysAgo(0), 7, TODAY), true);
  assert.equal(isWithinPeriod(isoDaysAgo(6), 7, TODAY), true, "7º dia (índice 6) ainda está dentro de 7 dias");
  assert.equal(isWithinPeriod(isoDaysAgo(7), 7, TODAY), false, "8º dia já é fora");
});

test("parseLocalDate: não sofre o deslocamento de fuso de uma data UTC nua", () => {
  const date = parseLocalDate("2026-09-22");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 8);
  assert.equal(date.getDate(), 22);
});

// ---------------------------------------------------------------- computeSalesChart
test("gráfico: agrupa vendas pagas por dia em janela de 7 dias", () => {
  const transactions = [tx({ transactionDate: isoDaysAgo(0), amount: 100 }), tx({ id: "2", transactionDate: isoDaysAgo(3), amount: 50 })];
  const chart = computeSalesChart(transactions, 7, TODAY);
  assert.equal(chart.length, 7);
  assert.equal(chart.reduce((sum, b) => sum + b.total, 0), 150);
});

test("gráfico: sem vendas pagas, todos os buckets ficam com total 0 (sem inventar valor)", () => {
  const chart = computeSalesChart([tx({ status: "pending" })], 7, TODAY);
  assert.ok(chart.every((b) => b.total === 0));
});

test("gráfico: períodos de 30/90 dias agrupam por semana (não vira 30/90 barras)", () => {
  const chart30 = computeSalesChart([tx()], 30, TODAY);
  assert.ok(chart30.length < 30 && chart30.length > 1);
  const chart90 = computeSalesChart([tx()], 90, TODAY);
  assert.ok(chart90.length < 90 && chart90.length > 1);
});

// ---------------------------------------------------------------- Validação
const validInput = (overrides = {}) => ({
  type: "sale",
  description: "Venda balcão",
  amount: 150.5,
  status: "paid",
  transactionDate: "2026-09-22",
  dueDate: null,
  paymentMethod: "PIX",
  notes: null,
  ...overrides,
});

test("entrada válida é aceita e vira payload de banco com valores numéricos", () => {
  const parsed = parseTransactionInput(validInput());
  assert.equal(parsed.ok, true);
  const row = toTransactionRow(parsed.value);
  assert.equal(row.type, "sale");
  assert.equal(row.amount, 150.5);
  assert.equal(typeof row.amount, "number", "valor precisa ser number, nunca string formatada");
  assert.equal(row.transaction_date, "2026-09-22");
  assert.equal(row.payment_method, "PIX");
});

test("entradas inválidas são rejeitadas com mensagem", () => {
  const rejects = (overrides, pattern) => {
    const parsed = parseTransactionInput(validInput(overrides));
    assert.equal(parsed.ok, false, JSON.stringify(overrides));
    assert.match(parsed.error, pattern);
  };
  rejects({ type: "venda" }, /tipo/i);
  rejects({ description: "  " }, /Descrição/);
  rejects({ amount: 0 }, /valor/i);
  rejects({ amount: -10 }, /valor/i);
  rejects({ amount: "abc" }, /valor/i);
  rejects({ status: "confirmado" }, /status/i);
  rejects({ transactionDate: "22/09/2026" }, /data de movimentação/i);
  rejects({ transactionDate: "2026-13-40" }, /data de movimentação/i);
  rejects({ dueDate: "não é data" }, /vencimento/i);
  rejects({ id: "123" }, /Identificador/);
  assert.equal(parseTransactionInput(null).ok, false);
  assert.equal(parseTransactionInput("texto").ok, false);
});

test("valor é arredondado para 2 casas; forma de pagamento/observações vazias viram null", () => {
  const parsed = parseTransactionInput(validInput({ amount: 10.005, paymentMethod: "", notes: "" }));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.amount, 10.01);
  assert.equal(parsed.value.paymentMethod, null);
  assert.equal(parsed.value.notes, null);
});

test("isUuid", () => {
  assert.equal(isUuid(ID), true);
  assert.equal(isUuid("abc"), false);
  assert.equal(isUuid(undefined), false);
});

// ---------------------------------------------------------------- Mapeador
test("mapper converte numeric em number e nulos em undefined", () => {
  const row = {
    id: ID,
    type: "expense",
    description: "Aluguel",
    amount: "1800.00",
    status: "pending",
    transaction_date: "2026-09-22",
    due_date: null,
    payment_method: null,
    notes: null,
    created_at: "2026-09-22T10:00:00.000Z",
    updated_at: "2026-09-22T10:00:00.000Z",
  };
  const transaction = toFinanceTransaction(row);
  assert.equal(transaction.amount, 1800);
  assert.equal(typeof transaction.amount, "number");
  assert.equal(transaction.dueDate, undefined);
  assert.equal(transaction.paymentMethod, undefined);
});

// ---------------------------------------------------------------- CSV
test("CSV: cabeçalho e colunas na ordem pedida, valor com ponto decimal e datas ISO", () => {
  const csv = transactionsToCsv([
    tx({ amount: 1234.5, paymentMethod: "PIX", dueDate: "2026-09-30", notes: "Cliente frequente" }),
  ]);
  const lines = csv.replace(/^﻿/, "").split("\r\n");
  assert.equal(lines[0], "Data,Tipo,Descrição,Status,Valor,Vencimento,Forma de pagamento,Observações");
  assert.equal(lines[1], "2026-09-22,Venda,Venda de teste,Pago,1234.50,2026-09-30,PIX,Cliente frequente");
});

test("CSV: campo com vírgula/aspas é escapado corretamente (RFC 4180)", () => {
  const csv = transactionsToCsv([tx({ description: 'Venda, com "aspas"' })]);
  assert.match(csv, /"Venda, com ""aspas"""/);
});

test("financeCsvFilename: usa a data atual no nome do arquivo", () => {
  const name = financeCsvFilename(new Date(2026, 8, 22));
  assert.equal(name, "xavier-financeiro-2026-09-22.csv");
});
