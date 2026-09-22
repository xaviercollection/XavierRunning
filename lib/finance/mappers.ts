// Linha do banco -> FinanceTransaction (tipo que a UI usa). Sem imports em runtime (só tipos)
// para poder ser testado direto no Node, como lib/store/mappers.ts.

import type { FinanceTransaction, TransactionStatus, TransactionType } from "./types";

export interface TransactionRow {
  id: string;
  type: string;
  description: string;
  amount: number | string;
  status: string;
  transaction_date: string;
  due_date: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function toFinanceTransaction(row: TransactionRow): FinanceTransaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    description: row.description,
    amount: Number(row.amount),
    status: row.status as TransactionStatus,
    transactionDate: row.transaction_date,
    dueDate: row.due_date ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
