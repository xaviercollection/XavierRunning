-- Xavier Collection — volume (ml) e leitura pública de estoque para a sacola.
--
-- Contexto: a sacola/carrinho roda inteiramente no navegador do cliente (sem tabela de
-- pedidos, sem checkout no servidor — ver comentário em 20260921120000_store_schema.sql).
-- Para impedir que o cliente deixe uma quantidade maior do que o estoque disponível, a
-- vitrine precisa enxergar products.stock. Continua sendo uma coluna informativa, editada
-- manualmente pelo lojista; nada aqui altera esse comportamento.

-- ---------------------------------------------------------------------------
-- volume_ml: definido pelo admin no cadastro (ex.: perfumes). O cliente NUNCA escolhe o
-- volume — por isso não é uma variação/opção, é um dado fixo do produto. Opcional; produtos
-- existentes continuam com volume_ml = NULL sem qualquer efeito colateral.
-- ---------------------------------------------------------------------------

alter table public.products
  add column volume_ml integer;

alter table public.products
  add constraint products_volume_ml_valid check (volume_ml is null or (volume_ml > 0 and volume_ml <= 100000));

comment on column public.products.volume_ml is 'Volume em ml (ex.: perfumes), definido pelo admin no cadastro. Opcional; NULL quando não se aplica. O cliente não escolhe volume na vitrine.';

-- ---------------------------------------------------------------------------
-- Grants: liberar leitura pública de volume_ml (exibido na vitrine) e de stock (necessário
-- para a sacola respeitar o limite de estoque no cliente, já que não há validação no servidor
-- nesta etapa). Grants de coluna são aditivos: isto não remove nenhuma permissão existente.
-- ---------------------------------------------------------------------------

grant select (volume_ml) on table public.products to anon;
grant select (stock)     on table public.products to anon;
