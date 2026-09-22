// Lista única de colunas usadas nas queries a financial_transactions — carregada também por
// scripts/db-test.mjs (mesma convenção de lib/store/columns.ts).

export const TRANSACTION_COLUMNS = [
  "id",
  "type",
  "description",
  "amount",
  "status",
  "transaction_date",
  "due_date",
  "payment_method",
  "notes",
  "created_at",
  "updated_at",
] as const;
