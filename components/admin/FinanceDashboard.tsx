"use client";

import { useMemo, useState } from "react";

type FinancePeriod = "7d" | "30d" | "90d";
type EntryType = "income" | "expense";
type EntryStatus = "paid" | "pending";

type FinanceEntry = {
  id: string;
  description: string;
  category: string;
  type: EntryType;
  amount: number;
  dueDate: string;
  status: EntryStatus;
};

type FinancePeriodData = {
  revenue: number;
  previousRevenue: number;
  grossProfit: number;
  expenses: number;
  sales: number;
  receivables: number;
  payables: number;
  cashBalance: number;
  chart: number[];
  chartLabels: string[];
};

const PERIODS: Record<FinancePeriod, { label: string; data: FinancePeriodData }> = {
  "7d": {
    label: "7 dias",
    data: {
      revenue: 12780,
      previousRevenue: 10940,
      grossProfit: 5820,
      expenses: 2140,
      sales: 43,
      receivables: 3920,
      payables: 1840,
      cashBalance: 28490,
      chart: [1420, 1860, 1340, 2240, 1750, 2380, 1790],
      chartLabels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    },
  },
  "30d": {
    label: "30 dias",
    data: {
      revenue: 48620,
      previousRevenue: 42230,
      grossProfit: 21890,
      expenses: 8450,
      sales: 157,
      receivables: 7920,
      payables: 5340,
      cashBalance: 28490,
      chart: [7840, 10320, 8920, 11870, 10340, 13290, 14940],
      chartLabels: ["01–04", "05–08", "09–12", "13–16", "17–20", "21–24", "25–30"],
    },
  },
  "90d": {
    label: "90 dias",
    data: {
      revenue: 136400,
      previousRevenue: 118700,
      grossProfit: 61240,
      expenses: 24680,
      sales: 438,
      receivables: 12480,
      payables: 9270,
      cashBalance: 28490,
      chart: [38200, 41600, 35100, 44800, 47200, 52100, 56800],
      chartLabels: ["Sem. 1", "Sem. 3", "Sem. 5", "Sem. 7", "Sem. 9", "Sem. 11", "Sem. 13"],
    },
  },
};

const INITIAL_ENTRIES: FinanceEntry[] = [
  { id: "fin-1", description: "Venda no balcão", category: "Vendas", type: "income", amount: 729.8, dueDate: "Hoje, 14:32", status: "paid" },
  { id: "fin-2", description: "Pedido pelo WhatsApp", category: "Vendas", type: "income", amount: 399.9, dueDate: "Hoje, 11:08", status: "paid" },
  { id: "fin-3", description: "Reposição de perfumes", category: "Fornecedores", type: "expense", amount: 2450, dueDate: "22 set", status: "pending" },
  { id: "fin-4", description: "Aluguel da loja", category: "Estrutura", type: "expense", amount: 1800, dueDate: "25 set", status: "pending" },
  { id: "fin-5", description: "Venda parcelada", category: "Cartões", type: "income", amount: 1249.7, dueDate: "27 set", status: "pending" },
  { id: "fin-6", description: "Energia e internet", category: "Operação", type: "expense", amount: 487.4, dueDate: "30 set", status: "pending" },
];

const CATEGORY_PERFORMANCE = [
  { name: "Perfumes", share: 38, revenue: 18475.6, margin: 52 },
  { name: "Camisas", share: 24, revenue: 11668.8, margin: 46 },
  { name: "Óculos e acessórios", share: 18, revenue: 8751.6, margin: 48 },
  { name: "Calças e shorts", share: 12, revenue: 5834.4, margin: 39 },
  { name: "Outros", share: 8, revenue: 3889.6, margin: 35 },
];

const EXPENSE_BREAKDOWN = [
  { label: "Fornecedores", value: 4110, share: 49 },
  { label: "Estrutura", value: 1960, share: 23 },
  { label: "Operação", value: 1430, share: 17 },
  { label: "Marketing", value: 950, share: 11 },
];

const EMPTY_ENTRY: Omit<FinanceEntry, "id"> = {
  description: "",
  category: "Vendas",
  type: "income",
  amount: 0,
  dueDate: "",
  status: "pending",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function FinanceDashboard({ onNotify }: { onNotify: (message: string) => void }) {
  const [period, setPeriod] = useState<FinancePeriod>("30d");
  const [entries, setEntries] = useState<FinanceEntry[]>(INITIAL_ENTRIES);
  const [entryEditorOpen, setEntryEditorOpen] = useState(false);
  const [entryDraft, setEntryDraft] = useState(EMPTY_ENTRY);

  const base = PERIODS[period].data;
  const pendingEntries = entries.filter((entry) => entry.status === "pending");
  const localTotals = useMemo(
    () =>
      entries.reduce(
        (totals, entry) => {
          if (!entry.id.startsWith("local-")) return totals;
          if (entry.type === "income" && entry.status === "paid") totals.income += entry.amount;
          if (entry.type === "expense" && entry.status === "paid") totals.expense += entry.amount;
          if (entry.type === "income" && entry.status === "pending") totals.receivable += entry.amount;
          if (entry.type === "expense" && entry.status === "pending") totals.payable += entry.amount;
          return totals;
        },
        { income: 0, expense: 0, receivable: 0, payable: 0 },
      ),
    [entries],
  );

  const revenue = base.revenue + localTotals.income;
  const expenses = base.expenses + localTotals.expense;
  const grossProfit = base.grossProfit + localTotals.income * 0.46;
  const result = grossProfit - expenses;
  const growth = ((revenue - base.previousRevenue) / base.previousRevenue) * 100;
  const ticket = revenue / base.sales;
  const margin = (result / revenue) * 100;
  const maxChartValue = Math.max(...base.chart);

  function saveEntry() {
    if (!entryDraft.description.trim() || entryDraft.amount <= 0 || !entryDraft.dueDate.trim()) return;
    setEntries((current) => [
      { ...entryDraft, id: `local-${Date.now()}` },
      ...current,
    ]);
    setEntryDraft(EMPTY_ENTRY);
    setEntryEditorOpen(false);
    onNotify("Movimentação adicionada ao protótipo.");
  }

  function markAsPaid(id: string) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, status: "paid" } : entry)));
    onNotify("Movimentação marcada como paga no protótipo.");
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 border border-white/[0.07] bg-[#090909] p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="admin-kicker">Controle financeiro</p>
          <h2 className="mt-2 font-display text-3xl text-champagne">Acompanhe o caixa da loja</h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-ink-muted">Valores demonstrativos para visualizar vendas, despesas, compromissos e rentabilidade.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border border-white/[0.08] bg-black/20 p-1" aria-label="Período financeiro">
            {(Object.keys(PERIODS) as FinancePeriod[]).map((item) => (
              <button key={item} type="button" onClick={() => setPeriod(item)} className={`px-3.5 py-2 text-[9px] tracking-[0.16em] uppercase transition-colors ${period === item ? "bg-gold text-black" : "text-ink-muted hover:text-ink"}`}>{PERIODS[item].label}</button>
            ))}
          </div>
          <button type="button" onClick={() => onNotify("Relatório preparado para integração com o back-end.")} className="admin-button-secondary">Exportar</button>
          <button type="button" onClick={() => setEntryEditorOpen(true)} className="admin-button-primary"><span className="text-base">＋</span> Nova movimentação</button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetric label="Faturamento" value={formatCompactCurrency(revenue)} detail={`+${growth.toFixed(1).replace(".", ",")}% sobre o período anterior`} trend="up" />
        <FinanceMetric label="Resultado estimado" value={formatCompactCurrency(result)} detail={`Margem líquida de ${margin.toFixed(1).replace(".", ",")}%`} trend="up" />
        <FinanceMetric label="Ticket médio" value={formatCurrency(ticket)} detail={`${base.sales} vendas no período`} />
        <FinanceMetric label="Saldo disponível" value={formatCompactCurrency(base.cashBalance + localTotals.income - localTotals.expense)} detail="Caixa e contas conectadas" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="admin-panel p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="admin-kicker">Receita</p><h2 className="admin-title mt-2">Evolução das vendas</h2></div>
            <div className="text-left sm:text-right"><p className="text-[9px] tracking-[0.16em] text-ink-faint uppercase">Total do período</p><p className="mt-1 font-display text-2xl text-champagne">{formatCurrency(revenue)}</p></div>
          </div>
          <div className="mt-8 grid h-64 grid-cols-7 items-end gap-2 border-b border-white/[0.08] pb-8 sm:gap-4">
            {base.chart.map((value, index) => (
              <div key={`${period}-${base.chartLabels[index]}`} className="group relative flex h-full items-end justify-center">
                <div className="absolute bottom-full mb-2 hidden whitespace-nowrap border border-white/10 bg-[#111] px-2 py-1 text-[9px] text-champagne group-hover:block">{formatCurrency(value)}</div>
                <div className="w-full max-w-12 border-t border-gold bg-gold/20 transition-all duration-700 group-hover:bg-gold/35" style={{ height: `${Math.max((value / maxChartValue) * 100, 8)}%` }} />
                <span className="absolute -bottom-6 whitespace-nowrap text-[8px] text-ink-faint">{base.chartLabels[index]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel p-5 md:p-6">
          <p className="admin-kicker">Compromissos</p>
          <h2 className="admin-title mt-2">A pagar e receber</h2>
          <div className="mt-6 space-y-3">
            <FinanceBalanceRow label="A receber" value={base.receivables + localTotals.receivable} tone="positive" detail="Vendas parceladas e pendentes" />
            <FinanceBalanceRow label="A pagar" value={base.payables + localTotals.payable} tone="negative" detail="Fornecedores e operação" />
            <FinanceBalanceRow label="Saldo projetado" value={base.cashBalance + base.receivables - base.payables + localTotals.receivable - localTotals.payable} tone="neutral" detail="Projeção após os vencimentos" />
          </div>
          <div className="mt-6 border border-amber-400/15 bg-amber-400/[0.04] p-4">
            <p className="text-[9px] tracking-[0.18em] text-amber-300 uppercase">Atenção financeira</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">{pendingEntries.filter((entry) => entry.type === "expense").length} contas pendentes. A próxima é “{pendingEntries.find((entry) => entry.type === "expense")?.description}”.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="admin-panel">
          <div className="admin-panel-header"><div><p className="admin-kicker">Fluxo de caixa</p><h2 className="admin-title">Últimas movimentações</h2></div><span className="text-[9px] text-ink-faint">{entries.length} registros</span></div>
          <div className="divide-y divide-white/[0.06]">
            {entries.slice(0, 7).map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 md:grid-cols-[1fr_100px_110px_auto] md:px-6">
                <div className="min-w-0"><p className="truncate text-sm text-ink">{entry.description}</p><p className="mt-1 text-[9px] tracking-[0.14em] text-ink-faint uppercase">{entry.category} · {entry.dueDate}</p></div>
                <span className={`text-right text-sm ${entry.type === "income" ? "text-emerald-300" : "text-red-300"}`}>{entry.type === "income" ? "+" : "−"} {formatCurrency(entry.amount)}</span>
                <span className={`hidden justify-self-start border px-2 py-1 text-[8px] tracking-wider uppercase md:inline-flex ${entry.status === "paid" ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300" : "border-amber-400/15 bg-amber-400/[0.05] text-amber-300"}`}>{entry.status === "paid" ? "Pago" : "Pendente"}</span>
                {entry.status === "pending" ? <button type="button" onClick={() => markAsPaid(entry.id)} className="hidden text-[9px] text-gold hover:text-champagne md:block">Dar baixa</button> : <span className="hidden w-12 md:block" />}
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel p-5 md:p-6">
          <p className="admin-kicker">Custos</p>
          <h2 className="admin-title mt-2">Onde a loja está gastando</h2>
          <div className="mt-7 space-y-5">
            {EXPENSE_BREAKDOWN.map((expense) => (
              <div key={expense.label}>
                <div className="flex items-center justify-between text-xs"><span className="text-ink-muted">{expense.label}</span><span className="text-champagne">{formatCurrency(expense.value)}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden bg-white/[0.05]"><div className="h-full bg-gold/60" style={{ width: `${expense.share}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex items-center justify-between border-t border-white/[0.07] pt-5"><span className="text-xs text-ink-muted">Despesas do período</span><span className="font-display text-2xl text-champagne">{formatCurrency(expenses)}</span></div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="admin-panel">
          <div className="admin-panel-header"><div><p className="admin-kicker">Desempenho</p><h2 className="admin-title">Faturamento por categoria</h2></div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="border-b border-white/[0.07] text-[8px] tracking-[0.18em] text-ink-faint uppercase"><tr><th className="px-6 py-4 font-normal">Categoria</th><th className="px-4 py-4 font-normal">Participação</th><th className="px-4 py-4 font-normal">Faturamento</th><th className="px-6 py-4 text-right font-normal">Margem</th></tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {CATEGORY_PERFORMANCE.map((category) => (
                  <tr key={category.name}><td className="px-6 py-4 text-sm">{category.name}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="h-1.5 w-20 bg-white/[0.05]"><div className="h-full bg-gold/70" style={{ width: `${category.share}%` }} /></div><span className="text-[10px] text-ink-muted">{category.share}%</span></div></td><td className="px-4 py-4 text-xs text-champagne">{formatCurrency(category.revenue)}</td><td className="px-6 py-4 text-right text-xs text-emerald-300">{category.margin}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel p-5 md:p-6">
          <p className="admin-kicker">DRE simplificada</p>
          <h2 className="admin-title mt-2">Resultado do período</h2>
          <div className="mt-6 divide-y divide-white/[0.06]">
            <StatementRow label="Receita bruta" value={revenue * 1.035} />
            <StatementRow label="Descontos e taxas" value={-(revenue * 0.035)} muted />
            <StatementRow label="Receita líquida" value={revenue} />
            <StatementRow label="Custo dos produtos" value={-(revenue - grossProfit)} muted />
            <StatementRow label="Lucro bruto" value={grossProfit} />
            <StatementRow label="Despesas operacionais" value={-expenses} muted />
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-gold/20 pt-5"><div><p className="text-[9px] tracking-[0.18em] text-gold uppercase">Resultado estimado</p><p className="mt-1 text-xs text-ink-muted">Antes de impostos</p></div><p className="font-display text-3xl text-champagne">{formatCurrency(result)}</p></div>
        </div>
      </section>

      {entryEditorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Nova movimentação financeira">
          <button type="button" className="absolute inset-0" onClick={() => setEntryEditorOpen(false)} aria-label="Fechar movimentação" />
          <div className="relative z-10 w-full max-w-lg border border-white/10 bg-[#090909] p-6 md:p-8">
            <div className="flex items-start justify-between"><div><p className="admin-kicker">Fluxo de caixa</p><h2 className="admin-title mt-2">Nova movimentação</h2></div><button type="button" onClick={() => setEntryEditorOpen(false)} className="admin-icon-button" aria-label="Fechar">×</button></div>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <FinanceField label="Tipo"><select value={entryDraft.type} onChange={(event) => setEntryDraft({ ...entryDraft, type: event.target.value as EntryType })} className="admin-select w-full"><option value="income">Entrada</option><option value="expense">Saída</option></select></FinanceField>
              <FinanceField label="Status"><select value={entryDraft.status} onChange={(event) => setEntryDraft({ ...entryDraft, status: event.target.value as EntryStatus })} className="admin-select w-full"><option value="pending">Pendente</option><option value="paid">Pago</option></select></FinanceField>
              <FinanceField label="Descrição" className="md:col-span-2"><input value={entryDraft.description} onChange={(event) => setEntryDraft({ ...entryDraft, description: event.target.value })} className="admin-input" placeholder="Ex.: Pagamento do fornecedor" /></FinanceField>
              <FinanceField label="Categoria"><input value={entryDraft.category} onChange={(event) => setEntryDraft({ ...entryDraft, category: event.target.value })} className="admin-input" /></FinanceField>
              <FinanceField label="Valor"><input type="number" min="0" step="0.01" value={entryDraft.amount || ""} onChange={(event) => setEntryDraft({ ...entryDraft, amount: Number(event.target.value) })} className="admin-input" placeholder="0,00" /></FinanceField>
              <FinanceField label="Vencimento / data" className="md:col-span-2"><input value={entryDraft.dueDate} onChange={(event) => setEntryDraft({ ...entryDraft, dueDate: event.target.value })} className="admin-input" placeholder="Ex.: 28 set" /></FinanceField>
            </div>
            <div className="mt-8 flex justify-end gap-3"><button type="button" onClick={() => setEntryEditorOpen(false)} className="admin-button-secondary">Cancelar</button><button type="button" onClick={saveEntry} disabled={!entryDraft.description.trim() || entryDraft.amount <= 0 || !entryDraft.dueDate.trim()} className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-40">Adicionar movimentação</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceMetric({ label, value, detail, trend }: { label: string; value: string; detail: string; trend?: "up" | "down" }) {
  return <div className="admin-panel p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[8px] tracking-[0.25em] text-ink-faint uppercase">{label}</p><p className="mt-4 font-display text-3xl text-champagne md:text-4xl">{value}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold/15 bg-gold/[0.04] text-gold"><FinanceIcon /></span></div><p className={`mt-4 border-t border-white/[0.06] pt-3 text-[10px] ${trend === "up" ? "text-emerald-300" : trend === "down" ? "text-red-300" : "text-ink-muted"}`}>{trend === "up" ? "↗ " : trend === "down" ? "↘ " : ""}{detail}</p></div>;
}

function FinanceBalanceRow({ label, value, tone, detail }: { label: string; value: number; tone: "positive" | "negative" | "neutral"; detail: string }) {
  const color = tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : "text-champagne";
  return <div className="border border-white/[0.07] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-ink">{label}</p><p className="mt-1 text-[9px] text-ink-faint">{detail}</p></div><p className={`font-display text-xl ${color}`}>{formatCurrency(value)}</p></div></div>;
}

function StatementRow({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return <div className="flex items-center justify-between py-3.5 text-xs"><span className={muted ? "text-ink-faint" : "text-ink-muted"}>{label}</span><span className={value < 0 ? "text-red-300" : "text-champagne"}>{value < 0 ? "− " : ""}{formatCurrency(Math.abs(value))}</span></div>;
}

function FinanceField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-[8px] tracking-[0.22em] text-ink-faint uppercase">{label}</span>{children}</label>;
}

function FinanceIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-[18px] w-[18px]" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /><path d="m3 7 6-4 6 5 6-4" /></svg>;
}
