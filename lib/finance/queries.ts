import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TRANSACTION_COLUMNS } from "./columns";
import { toFinanceTransaction, type TransactionRow } from "./mappers";
import type { FinanceTransaction } from "./types";

/**
 * Leitura do financeiro: só chamada depois que app/admin/page.tsx já confirmou is_admin() (ver
 * getAdminSession). RLS é a autoridade final mesmo assim — um não-admin aqui só receberia lista
 * vazia, nunca dado de outro tipo de sessão (não existe policy pública para esta tabela).
 */
export async function getFinanceTransactions(): Promise<FinanceTransaction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("financial_transactions")
    .select(TRANSACTION_COLUMNS.join(","))
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .overrideTypes<TransactionRow[], { merge: false }>();

  if (error) throw new Error(`Falha ao carregar o financeiro: ${error.message}`);
  return (data ?? []).map(toFinanceTransaction);
}
