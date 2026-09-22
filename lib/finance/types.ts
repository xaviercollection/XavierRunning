export type TransactionType = "sale" | "income" | "expense";
export type TransactionStatus = "paid" | "pending";

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  status: TransactionStatus;
  /** ISO "YYYY-MM-DD" (coluna date — sem hora/fuso). */
  transactionDate: string;
  dueDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload enviado pelo formulário do painel (validado de novo no servidor). */
export type TransactionInput = {
  /** Ausente = criar movimentação. */
  id?: string;
  type: TransactionType;
  description: string;
  amount: number;
  status: TransactionStatus;
  transactionDate: string;
  dueDate?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
};

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };
