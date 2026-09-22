-- Xavier Collection — financeiro real (substitui a tela demonstrativa do painel).
--
-- Modelo: uma única tabela cobre venda/entrada/despesa, pago/pendente — o suficiente para o
-- lojista registrar manualmente o caixa da loja. Não há tabela de pedidos: a venda pelo
-- WhatsApp continua fora do banco (ver lib/store/whatsapp.ts); uma movimentação financeira só
-- existe quando o admin a registra/confirma aqui, nunca automaticamente pela sacola/WhatsApp.
--
-- Dado sensível: ao contrário de products/categories, NENHUM papel público tem acesso — nem
-- select. Só authenticated+is_admin() (via RLS) e service_role.

-- ---------------------------------------------------------------------------
-- financial_transactions
-- ---------------------------------------------------------------------------

create table public.financial_transactions (
  id                uuid primary key default gen_random_uuid(),

  type              text not null,
  description       text not null,
  amount            numeric(10, 2) not null,
  status            text not null default 'pending',

  transaction_date  date not null default current_date,
  due_date          date,
  payment_method    text,
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint financial_transactions_type_valid check (type in ('sale', 'income', 'expense')),
  constraint financial_transactions_status_valid check (status in ('paid', 'pending')),
  constraint financial_transactions_amount_valid check (amount > 0 and amount < 10000000),
  constraint financial_transactions_description_valid check (char_length(btrim(description)) between 1 and 200),
  constraint financial_transactions_payment_method_valid check (payment_method is null or char_length(payment_method) <= 40),
  constraint financial_transactions_notes_valid check (notes is null or char_length(notes) <= 1000)
);

comment on table public.financial_transactions is
  'Lançamentos financeiros manuais da loja (venda/entrada/despesa). Alimentado só pelo admin — nada aqui é criado automaticamente pela sacola ou pelo checkout via WhatsApp.';
comment on column public.financial_transactions.type is 'sale = venda | income = outra entrada | expense = saída/despesa.';
comment on column public.financial_transactions.status is 'paid = pago/recebido | pending = pendente.';
comment on column public.financial_transactions.transaction_date is 'Data da movimentação (competência). Usada para os filtros de período e o gráfico.';
comment on column public.financial_transactions.due_date is 'Vencimento, principalmente relevante para pendentes. Opcional.';

create index financial_transactions_type_idx on public.financial_transactions (type);
create index financial_transactions_status_idx on public.financial_transactions (status);
create index financial_transactions_transaction_date_idx on public.financial_transactions (transaction_date);

-- Reaproveita a função já existente (ver 20260921120000_store_schema.sql) — nenhuma função nova.
create trigger financial_transactions_set_updated_at
  before update on public.financial_transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: sem policy pública nenhuma (nem select) — só admin autenticado e service_role.
-- ---------------------------------------------------------------------------

alter table public.financial_transactions enable row level security;

revoke all on table public.financial_transactions from public, anon, authenticated;

grant select, insert, update, delete on table public.financial_transactions to authenticated;
grant all on table public.financial_transactions to service_role;

-- Única policy "for all": não existe policy pública para combinar aqui (diferente de
-- products/categories), então não há o risco de dupla avaliação que motivou policies separadas
-- por ação em 20260921171824_tighten_admin_policies.sql.
create policy financial_transactions_admin_all
  on public.financial_transactions for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
