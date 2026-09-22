-- Xavier Collection — tipo de produto por categoria (fonte única de verdade para os atributos
-- que fazem sentido em cada produto: volume para perfume, numeração para calçado, etc.).
--
-- Por quê: sizes/colors/volume_ml já existem em products e continuam sendo os únicos campos de
-- variação — esta migration NÃO cria estrutura paralela. Ela só classifica a CATEGORIA, para que
-- o admin/loja/sacola/WhatsApp saibam quais desses campos mostrar para aquele produto, em vez de
-- tratar todo produto como se fosse roupa (P/M/G) ou depender de comparar o nome da categoria.

-- ---------------------------------------------------------------------------
-- Coluna: opcional na prática (tem default), compatível com categorias existentes — nenhuma
-- fica sem classificação. CHECK em vez de enum nativo: adicionar um tipo novo no futuro é só
-- estender a lista, sem `ALTER TYPE` (mais simples e sem lock adicional).
-- ---------------------------------------------------------------------------

alter table public.categories
  add column product_type text not null default 'generic';

alter table public.categories
  add constraint categories_product_type_valid check (
    product_type in ('perfume', 'clothing', 'footwear', 'glasses', 'watch', 'accessory', 'generic')
  );

comment on column public.categories.product_type is
  'Classifica quais atributos de variação fazem sentido para produtos desta categoria (ver lib/store/productType.ts). "generic" preserva o comportamento atual (tamanhos + cores) para categorias ainda não classificadas.';

-- Leitura pública já é liberada por já ser tabela inteira (`grant select on table categories to
-- anon`, ver 20260921120200_rls_and_grants.sql) — nenhum grant novo necessário.

-- ---------------------------------------------------------------------------
-- Classificação das categorias já cadastradas (mesmas 9 da seed inicial — ver
-- 20260921120500_seed_catalog.sql). Mapeamento por slug (não por adivinhação de nome livre):
--   perfumes            -> perfume
--   camisas              -> clothing
--   casacos               -> clothing
--   chapeus-e-bones        -> accessory  (boné/chapéu: normalmente tamanho único, é acessório)
--   oculos                  -> glasses
--   sapatos                  -> footwear
--   calcas                    -> clothing
--   shorts                      -> clothing
--   roupas-de-academia            -> clothing
-- Qualquer categoria com slug fora desta lista mantém 'generic' (default da coluna) e pode ser
-- reclassificada a qualquer momento pelo admin, sem precisar de nova migration.
-- ---------------------------------------------------------------------------

update public.categories set product_type = 'perfume'   where slug = 'perfumes';
update public.categories set product_type = 'clothing'  where slug in ('camisas', 'casacos', 'calcas', 'shorts', 'roupas-de-academia');
update public.categories set product_type = 'accessory' where slug = 'chapeus-e-bones';
update public.categories set product_type = 'glasses'   where slug = 'oculos';
update public.categories set product_type = 'footwear'  where slug = 'sapatos';
