// Exportação das movimentações em CSV. Roda inteiramente no navegador (os dados já estão
// carregados no painel) — sem rota/Server Action nova. Sem imports em runtime (só tipos).

import type { FinanceTransaction, TransactionStatus, TransactionType } from "./types";

const TYPE_LABELS: Record<TransactionType, string> = {
  sale: "Venda",
  income: "Entrada",
  expense: "Despesa",
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
};

const CSV_HEADER = ["Data", "Tipo", "Descrição", "Status", "Valor", "Vencimento", "Forma de pagamento", "Observações"];

/** Campos com vírgula, aspas ou quebra de linha precisam ser envolvidos em aspas (RFC 4180). */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Ponto decimal (não vírgula) de propósito: o separador de campo do CSV já é vírgula, e um
// valor "1234,50" forçaria aspas em toda linha. BRL fica só na tela (formatCurrency); o CSV é
// dado bruto para planilha/sistema, mais portátil com ponto.
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

export function transactionsToCsv(transactions: FinanceTransaction[]): string {
  const rows = transactions.map((t) =>
    [
      t.transactionDate,
      TYPE_LABELS[t.type],
      t.description,
      STATUS_LABELS[t.status],
      formatAmount(t.amount),
      t.dueDate ?? "",
      t.paymentMethod ?? "",
      t.notes ?? "",
    ]
      .map((field) => escapeCsvField(String(field)))
      .join(","),
  );
  // BOM UTF-8: sem isso, Excel abre acentos quebrados em CSV.
  return `﻿${[CSV_HEADER.join(","), ...rows].join("\r\n")}`;
}

export function financeCsvFilename(now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  return `xavier-financeiro-${date}.csv`;
}
