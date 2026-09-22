"use server";

// Server Actions do financeiro. Mesma regra do resto do painel (ver lib/store/admin-actions.ts):
// toda action passa por withAdmin (sessão + is_admin()) e a RLS da tabela é a autoridade final.
// Nenhuma action aqui é chamada pela sacola/checkout — o financeiro só é alimentado pelo admin.

import { done, fail, withAdmin, type ActionResult, type DbError } from "@/lib/admin/withAdmin";
import { TRANSACTION_COLUMNS } from "./columns";
import { toFinanceTransaction, type TransactionRow } from "./mappers";
import type { FinanceTransaction } from "./types";
import { isUuid, parseTransactionInput, toTransactionRow } from "./validation";

function describeDbError(error: DbError): string {
  switch (error.code) {
    case "23514":
      return "Algum valor não passou nas regras do banco (confira valor, descrição e datas).";
    case "42501":
      return "Sem permissão de administrador para esta operação.";
    default:
      console.error("[finance/actions] erro do banco:", error.code, error.message);
      return "Não foi possível concluir a operação. Tente novamente.";
  }
}

export async function createTransactionAction(input: unknown): Promise<ActionResult<FinanceTransaction>> {
  return withAdmin(async (supabase) => {
    const parsed = parseTransactionInput(input);
    if (!parsed.ok) return fail(parsed.error);

    const { data, error } = await supabase
      .from("financial_transactions")
      .insert(toTransactionRow(parsed.value))
      .select(TRANSACTION_COLUMNS.join(","))
      .single<TransactionRow>();
    if (error) return fail(describeDbError(error));
    return done(toFinanceTransaction(data));
  });
}

export async function updateTransactionAction(id: string, input: unknown): Promise<ActionResult<FinanceTransaction>> {
  if (!isUuid(id)) return fail("Identificador da movimentação inválido.");

  return withAdmin(async (supabase) => {
    const parsed = parseTransactionInput(input);
    if (!parsed.ok) return fail(parsed.error);

    const { data, error } = await supabase
      .from("financial_transactions")
      .update(toTransactionRow(parsed.value))
      .eq("id", id)
      .select(TRANSACTION_COLUMNS.join(","))
      .maybeSingle<TransactionRow>();
    if (error) return fail(describeDbError(error));
    if (!data) return fail("Movimentação não encontrada.");
    return done(toFinanceTransaction(data));
  });
}

export async function deleteTransactionAction(id: string): Promise<ActionResult<{ id: string }>> {
  if (!isUuid(id)) return fail("Identificador da movimentação inválido.");

  return withAdmin(async (supabase) => {
    const { data, error } = await supabase.from("financial_transactions").delete().eq("id", id).select("id");
    if (error) return fail(describeDbError(error));
    if (!data || data.length === 0) return fail("Movimentação não encontrada ou sem permissão para remover.");
    return done({ id });
  });
}

/** Atalho de "Dar baixa": marca uma movimentação pendente como paga sem reabrir o formulário. */
export async function markTransactionPaidAction(id: string): Promise<ActionResult<FinanceTransaction>> {
  if (!isUuid(id)) return fail("Identificador da movimentação inválido.");

  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("financial_transactions")
      .update({ status: "paid" })
      .eq("id", id)
      .select(TRANSACTION_COLUMNS.join(","))
      .maybeSingle<TransactionRow>();
    if (error) return fail(describeDbError(error));
    if (!data) return fail("Movimentação não encontrada.");
    return done(toFinanceTransaction(data));
  });
}
