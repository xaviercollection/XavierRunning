"use client";

// Financeiro real, alimentado manualmente pelo admin (ver lib/finance/). Nenhuma movimentação é
// criada pela sacola ou pelo checkout via WhatsApp — a venda só entra aqui quando o lojista
// registra. Regra de período documentada em lib/finance/calculations.ts.

import { useMemo, useState } from "react";
import type { ActionResult } from "@/lib/admin/withAdmin";
import {
  createTransactionAction,
  deleteTransactionAction,
  markTransactionPaidAction,
  updateTransactionAction,
} from "@/lib/finance/actions";
import { computeFinanceSummary, computeSalesChart, isWithinPeriod } from "@/lib/finance/calculations";
import { financeCsvFilename, transactionsToCsv } from "@/lib/finance/csv";
import type { FinanceTransaction, TransactionInput, TransactionStatus, TransactionType } from "@/lib/finance/types";
import { PAYMENT_METHODS } from "@/lib/finance/validation";

type FinancePeriod = "7d" | "30d" | "90d";
const PERIOD_DAYS: Record<FinancePeriod, number> = { "7d": 7, "30d": 30, "90d": 90 };
const PERIOD_LABELS: Record<FinancePeriod, string> = { "7d": "7 dias", "30d": "30 dias", "90d": "90 dias" };

const TYPE_LABELS: Record<TransactionType, string> = { sale: "Venda", income: "Entrada", expense: "Despesa" };
const STATUS_LABELS: Record<TransactionStatus, string> = { paid: "Pago", pending: "Pendente" };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): TransactionInput {
  return {
    type: "sale",
    description: "",
    amount: 0,
    status: "paid",
    transactionDate: todayIso(),
    dueDate: null,
    paymentMethod: null,
    notes: null,
  };
}

function draftFromTransaction(t: FinanceTransaction): TransactionInput {
  return {
    type: t.type,
    description: t.description,
    amount: t.amount,
    status: t.status,
    transactionDate: t.transactionDate,
    dueDate: t.dueDate ?? null,
    paymentMethod: t.paymentMethod ?? null,
    notes: t.notes ?? null,
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateDisplay(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Uma Server Action pode lançar (rede caiu, deploy em andamento). Nunca deixe a UI presa por isso. */
async function runAction<T>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch {
    return { ok: false, error: "Sem conexão com o servidor. Verifique a internet e tente novamente." };
  }
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FinanceDashboard({
  initialTransactions,
  onNotify,
}: {
  initialTransactions: FinanceTransaction[];
  onNotify: (message: string) => void;
}) {
  const [period, setPeriod] = useState<FinancePeriod>("30d");
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(initialTransactions);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TransactionInput>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FinanceTransaction | null>(null);

  const periodDays = PERIOD_DAYS[period];
  const summary = useMemo(() => computeFinanceSummary(transactions, periodDays), [transactions, periodDays]);
  const chart = useMemo(() => computeSalesChart(transactions, periodDays), [transactions, periodDays]);
  const hasChartData = chart.some((bucket) => bucket.total > 0);
  const maxChartValue = Math.max(1, ...chart.map((bucket) => bucket.total));

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt)),
    [transactions],
  );

  const pendingExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "expense" && t.status === "pending")
        .sort((a, b) => (a.dueDate ?? a.transactionDate).localeCompare(b.dueDate ?? b.transactionDate)),
    [transactions],
  );

  function update<K extends keyof TransactionInput>(key: K, value: TransactionInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function openNew() {
    setEditingId(null);
    setDraft(emptyDraft());
    setEditorOpen(true);
  }

  function openEdit(transaction: FinanceTransaction) {
    setEditingId(transaction.id);
    setDraft(draftFromTransaction(transaction));
    setEditorOpen(true);
  }

  async function saveTransaction() {
    if (saving || !draft.description.trim() || draft.amount <= 0) return;
    setSaving(true);
    const result = editingId
      ? await runAction(() => updateTransactionAction(editingId, draft))
      : await runAction(() => createTransactionAction(draft));
    setSaving(false);

    if (!result.ok) {
      onNotify(result.error);
      return;
    }
    setTransactions((current) =>
      editingId ? current.map((t) => (t.id === result.data.id ? result.data : t)) : [result.data, ...current],
    );
    setEditorOpen(false);
    onNotify(editingId ? "Movimentação atualizada." : "Movimentação registrada.");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    const result = await runAction(() => deleteTransactionAction(target.id));
    if (!result.ok) {
      onNotify(result.error);
      setPendingDelete(null);
      return;
    }
    setTransactions((current) => current.filter((t) => t.id !== target.id));
    setPendingDelete(null);
    onNotify("Movimentação removida.");
  }

  async function markPaid(id: string) {
    const result = await runAction(() => markTransactionPaidAction(id));
    if (!result.ok) {
      onNotify(result.error);
      return;
    }
    setTransactions((current) => current.map((t) => (t.id === id ? result.data : t)));
    onNotify("Movimentação marcada como paga.");
  }

  function exportCsv() {
    const periodTransactions = sortedTransactions.filter((t) => isWithinPeriod(t.transactionDate, periodDays));
    downloadCsv(transactionsToCsv(periodTransactions), financeCsvFilename());
    onNotify(periodTransactions.length > 0 ? "CSV exportado." : "CSV exportado (sem movimentações no período).");
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 border border-white/[0.07] bg-[#090909] p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="admin-kicker">Controle financeiro</p>
          <h2 className="mt-2 font-display text-3xl text-champagne">Acompanhe o caixa da loja</h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-ink-muted">
            Registre manualmente vendas, entradas e despesas. A venda pelo WhatsApp só entra aqui quando você confirmar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border border-white/[0.08] bg-black/20 p-1" aria-label="Período financeiro">
            {(Object.keys(PERIOD_DAYS) as FinancePeriod[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`px-3.5 py-2 text-[9px] tracking-[0.16em] uppercase transition-colors ${period === item ? "bg-gold text-black" : "text-ink-muted hover:text-ink"}`}
              >
                {PERIOD_LABELS[item]}
              </button>
            ))}
          </div>
          <button type="button" onClick={exportCsv} className="admin-button-secondary">Exportar</button>
          <button type="button" onClick={openNew} className="admin-button-primary"><span className="text-base">＋</span> Nova movimentação</button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetric label="Faturamento" value={formatCompactCurrency(summary.revenue)} detail={`${summary.salesCount} venda${summary.salesCount === 1 ? "" : "s"} paga${summary.salesCount === 1 ? "" : "s"} no período`} />
        <FinanceMetric label="Resultado estimado" value={formatCompactCurrency(summary.result)} detail="Vendas + entradas − despesas pagas" />
        <FinanceMetric label="Ticket médio" value={formatCurrency(summary.ticketAverage)} detail={summary.salesCount > 0 ? `${summary.salesCount} venda${summary.salesCount === 1 ? "" : "s"} no período` : "Sem vendas pagas no período"} />
        <FinanceMetric label="Saldo disponível" value={formatCompactCurrency(summary.availableBalance)} detail="Caixa total já liquidado" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="admin-panel p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="admin-kicker">Receita</p><h2 className="admin-title mt-2">Evolução das vendas</h2></div>
            <div className="text-left sm:text-right"><p className="text-[9px] tracking-[0.16em] text-ink-faint uppercase">Total do período</p><p className="mt-1 font-display text-2xl text-champagne">{formatCurrency(summary.revenue)}</p></div>
          </div>
          {hasChartData ? (
            <div
              className="mt-8 grid h-64 items-end gap-2 border-b border-white/[0.08] pb-8 sm:gap-3"
              style={{ gridTemplateColumns: `repeat(${chart.length}, minmax(0, 1fr))` }}
            >
              {chart.map((bucket, index) => (
                <div key={`${bucket.label}-${index}`} className="group relative flex h-full items-end justify-center">
                  <div className="absolute bottom-full mb-2 hidden whitespace-nowrap border border-white/10 bg-[#111] px-2 py-1 text-[9px] text-champagne group-hover:block">{formatCurrency(bucket.total)}</div>
                  <div
                    className="w-full max-w-12 border-t border-gold bg-gold/20 transition-all duration-700 group-hover:bg-gold/35"
                    style={{ height: `${bucket.total > 0 ? Math.max((bucket.total / maxChartValue) * 100, 8) : 1}%` }}
                  />
                  <span className="absolute -bottom-6 whitespace-nowrap text-[8px] text-ink-faint">{bucket.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 flex h-64 flex-col items-center justify-center gap-2 border-b border-white/[0.08] pb-8 text-center">
              <p className="text-sm text-ink-muted">Sem vendas registradas neste período.</p>
              <p className="max-w-xs text-[10px] text-ink-faint">Registre uma venda paga em &quot;Nova movimentação&quot; para ver a evolução aqui.</p>
            </div>
          )}
        </div>

        <div className="admin-panel p-5 md:p-6">
          <p className="admin-kicker">Compromissos</p>
          <h2 className="admin-title mt-2">A pagar e receber</h2>
          <div className="mt-6 space-y-3">
            <FinanceBalanceRow label="A receber" value={summary.receivable} tone="positive" detail="Vendas e entradas pendentes" />
            <FinanceBalanceRow label="A pagar" value={summary.payable} tone="negative" detail="Despesas pendentes" />
            <FinanceBalanceRow label="Saldo projetado" value={summary.projectedBalance} tone="neutral" detail="Saldo disponível + a receber − a pagar" />
          </div>
          <div className="mt-6 border border-amber-400/15 bg-amber-400/[0.04] p-4">
            <p className="text-[9px] tracking-[0.18em] text-amber-300 uppercase">Atenção financeira</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              {pendingExpenses.length === 0
                ? "Nenhuma despesa pendente no momento."
                : `${pendingExpenses.length} despesa${pendingExpenses.length === 1 ? "" : "s"} pendente${pendingExpenses.length === 1 ? "" : "s"}. A próxima é "${pendingExpenses[0].description}".`}
            </p>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div><p className="admin-kicker">Fluxo de caixa</p><h2 className="admin-title">Movimentações</h2></div>
          <span className="text-[9px] text-ink-faint">{transactions.length} registro{transactions.length === 1 ? "" : "s"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07] text-left text-[8px] tracking-[0.25em] text-ink-faint uppercase">
                <th className="px-6 py-4 font-normal">Data</th>
                <th className="px-4 py-4 font-normal">Descrição</th>
                <th className="px-4 py-4 font-normal">Tipo</th>
                <th className="px-4 py-4 font-normal">Status</th>
                <th className="px-4 py-4 text-right font-normal">Valor</th>
                <th className="px-6 py-4 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.055]">
              {sortedTransactions.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-white/[0.018]">
                  <td className="px-6 py-4 text-xs text-ink-muted">{formatDateDisplay(t.transactionDate)}</td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-ink">{t.description}</p>
                    {(t.paymentMethod || t.dueDate) && (
                      <p className="mt-1 text-[9px] tracking-[0.1em] text-ink-faint uppercase">
                        {[t.paymentMethod, t.dueDate ? `vence ${formatDateDisplay(t.dueDate)}` : null].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-ink-muted">{TYPE_LABELS[t.type]}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex border px-2.5 py-1.5 text-[8px] tracking-[0.15em] uppercase ${t.status === "paid" ? "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300" : "border-amber-400/15 bg-amber-400/[0.05] text-amber-300"}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className={`px-4 py-4 text-right text-sm ${t.type === "expense" ? "text-red-300" : "text-emerald-300"}`}>
                    {t.type === "expense" ? "− " : "+ "}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {t.status === "pending" && (
                        <button type="button" onClick={() => markPaid(t.id)} className="text-[9px] tracking-[0.14em] text-gold uppercase hover:text-champagne">Dar baixa</button>
                      )}
                      <button type="button" onClick={() => openEdit(t)} className="admin-icon-button" aria-label={`Editar ${t.description}`}><AdminEditIcon /></button>
                      <button type="button" onClick={() => setPendingDelete(t)} className="admin-icon-button hover:border-red-400/30 hover:text-red-300" aria-label={`Remover ${t.description}`}><AdminTrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-2xl">Nenhuma movimentação registrada.</p>
            <p className="mt-2 text-sm text-ink-muted">Use &quot;Nova movimentação&quot; para lançar a primeira venda, entrada ou despesa.</p>
          </div>
        )}
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={editingId ? "Editar movimentação" : "Nova movimentação financeira"}>
          <button type="button" className="absolute inset-0" onClick={() => setEditorOpen(false)} aria-label="Fechar movimentação" />
          <div className="relative z-10 w-full max-w-lg max-h-[92svh] overflow-y-auto border border-white/10 bg-[#090909] p-6 md:p-8">
            <div className="flex items-start justify-between">
              <div><p className="admin-kicker">Fluxo de caixa</p><h2 className="admin-title mt-2">{editingId ? "Editar movimentação" : "Nova movimentação"}</h2></div>
              <button type="button" onClick={() => setEditorOpen(false)} className="admin-icon-button" aria-label="Fechar">×</button>
            </div>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <FinanceField label="Tipo">
                <select value={draft.type} onChange={(e) => update("type", e.target.value as TransactionType)} className="admin-select w-full">
                  <option value="sale">Venda</option>
                  <option value="income">Entrada</option>
                  <option value="expense">Despesa</option>
                </select>
              </FinanceField>
              <FinanceField label="Status">
                <select value={draft.status} onChange={(e) => update("status", e.target.value as TransactionStatus)} className="admin-select w-full">
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                </select>
              </FinanceField>
              <FinanceField label="Descrição" className="md:col-span-2">
                <input value={draft.description} onChange={(e) => update("description", e.target.value)} maxLength={200} className="admin-input" placeholder="Ex.: Venda balcão — Camisa Signature" />
              </FinanceField>
              <FinanceField label="Valor">
                <input type="number" min="0.01" step="0.01" value={draft.amount || ""} onChange={(e) => update("amount", Number(e.target.value))} className="admin-input" placeholder="0,00" />
              </FinanceField>
              <FinanceField label="Forma de pagamento">
                <select value={draft.paymentMethod ?? ""} onChange={(e) => update("paymentMethod", e.target.value || null)} className="admin-select w-full">
                  <option value="">Não informado</option>
                  {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </FinanceField>
              <FinanceField label="Data da movimentação">
                <input type="date" value={draft.transactionDate} onChange={(e) => update("transactionDate", e.target.value)} className="admin-input" />
              </FinanceField>
              <FinanceField label="Data de vencimento (opcional)">
                <input type="date" value={draft.dueDate ?? ""} onChange={(e) => update("dueDate", e.target.value || null)} className="admin-input" />
              </FinanceField>
              <FinanceField label="Observações (opcional)" className="md:col-span-2">
                <textarea value={draft.notes ?? ""} onChange={(e) => update("notes", e.target.value || null)} maxLength={1000} className="admin-textarea" rows={3} />
              </FinanceField>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setEditorOpen(false)} className="admin-button-secondary">Cancelar</button>
              <button
                type="button"
                onClick={saveTransaction}
                disabled={saving || !draft.description.trim() || draft.amount <= 0}
                className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Salvando…" : "Salvar movimentação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="w-full max-w-md border border-white/10 bg-[#0a0a0a] p-7">
            <p className="eyebrow">Remover movimentação</p>
            <h2 className="mt-4 font-display text-3xl">Remover &quot;{pendingDelete.description}&quot;?</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">Esta ação não pode ser desfeita.</p>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingDelete(null)} className="admin-button-secondary">Cancelar</button>
              <button type="button" onClick={confirmDelete} className="admin-button-danger">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="admin-panel p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[8px] tracking-[0.25em] text-ink-faint uppercase">{label}</p><p className="mt-4 font-display text-3xl text-champagne md:text-4xl">{value}</p></div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold/15 bg-gold/[0.04] text-gold"><FinanceIcon /></span>
      </div>
      <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] text-ink-muted">{detail}</p>
    </div>
  );
}

function FinanceBalanceRow({ label, value, tone, detail }: { label: string; value: number; tone: "positive" | "negative" | "neutral"; detail: string }) {
  const color = tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : "text-champagne";
  return (
    <div className="border border-white/[0.07] p-4">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs text-ink">{label}</p><p className="mt-1 text-[9px] text-ink-faint">{detail}</p></div>
        <p className={`font-display text-xl ${color}`}>{formatCurrency(value)}</p>
      </div>
    </div>
  );
}

function FinanceField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-[8px] tracking-[0.22em] text-ink-faint uppercase">{label}</span>{children}</label>;
}

function FinanceIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-[18px] w-[18px]" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /><path d="m3 7 6-4 6 5 6-4" /></svg>;
}

function AdminEditIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true"><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" /><path d="m13.5 7 3.5 3.5" /></svg>;
}

function AdminTrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>;
}
