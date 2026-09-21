-- Xavier Collection — schema do catálogo da loja.
--
-- Regras de negócio que este schema respeita:
--   * Vendas NÃO são registradas no banco (não existe tabela de pedidos).
--   * Estoque é informativo e administrado manualmente pelo lojista: nenhuma
--     função/trigger deste projeto altera products.stock automaticamente.

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Valida o formato de products.colors: [{ "name": "Preto", "hex": "#171717" }, ...]
create or replace function public.colors_are_valid(c jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when c is null or jsonb_typeof(c) <> 'array' then false
    when jsonb_array_length(c) > 12 then false
    else not exists (
      select 1
        from jsonb_array_elements(c) as e(v)
       where jsonb_typeof(e.v) is distinct from 'object'
          or jsonb_typeof(e.v -> 'name') is distinct from 'string'
          or char_length(coalesce(e.v ->> 'name', '')) not between 1 and 40
          or coalesce(e.v ->> 'hex', '') !~ '^#[0-9a-fA-F]{6}$'
    )
  end
$$;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint categories_name_key unique (name),
  constraint categories_slug_key unique (slug),
  constraint categories_name_valid check (char_length(btrim(name)) between 1 and 60),
  constraint categories_slug_valid check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  constraint categories_sort_order_valid check (sort_order >= 0)
);

comment on table public.categories is 'Categorias exibidas na loja. is_visible=false esconde a categoria e os produtos dela do público.';

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,
  brand           text not null,
  name            text not null,
  description     text not null default '',
  category_id     uuid not null references public.categories (id) on delete restrict,

  price           numeric(10, 2) not null,
  original_price  numeric(10, 2),

  -- Caminho local (/images/...) ou URL pública do bucket product-images.
  image_url       text not null,
  -- CSS object-position, ex.: "30% 82%".
  image_position  text,
  image_fit       text not null default 'cover',

  colors          jsonb not null default '[]'::jsonb,
  sizes           text[] not null default array['Único']::text[],

  badge           text,
  status          text not null default 'draft',

  -- Informativo. Administrado manualmente pelo lojista; nunca é alterado por checkout.
  stock           integer not null default 0,

  is_featured     boolean not null default false,
  featured_rank   integer,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint products_slug_key unique (slug),
  constraint products_slug_valid check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  constraint products_brand_valid check (char_length(btrim(brand)) between 1 and 80),
  constraint products_name_valid check (char_length(btrim(name)) between 1 and 160),
  constraint products_description_valid check (char_length(description) <= 1200),
  constraint products_price_valid check (price >= 0 and price < 1000000),
  constraint products_original_price_valid check (original_price is null or original_price > price),
  constraint products_image_url_valid check (image_url ~ '^(/[^/]|https://)' and char_length(image_url) <= 600),
  constraint products_image_position_valid check (
    image_position is null
    or image_position ~ '^[0-9]{1,3}(\.[0-9]+)?% [0-9]{1,3}(\.[0-9]+)?%$'
  ),
  constraint products_image_fit_valid check (image_fit in ('cover', 'contain')),
  constraint products_colors_valid check (public.colors_are_valid(colors)),
  constraint products_sizes_valid check (
    cardinality(sizes) between 1 and 20
    and not (sizes && array['']::text[])
  ),
  constraint products_badge_valid check (badge is null or badge in ('novo', 'esgotado', 'ultimas-pecas')),
  constraint products_status_valid check (status in ('active', 'draft', 'out-of-stock')),
  constraint products_stock_valid check (stock >= 0),
  constraint products_featured_rank_valid check (featured_rank is null or featured_rank > 0)
);

comment on table public.products is 'Catálogo. Público enxerga apenas status active/out-of-stock em categorias visíveis.';
comment on column public.products.stock is 'Estoque manual (informativo). Não exposto ao papel anon.';
comment on column public.products.featured_rank is 'Ordem dos destaques / ranking de "mais vendidos" na loja.';

create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- store_settings (linha única)
-- ---------------------------------------------------------------------------

create table public.store_settings (
  id                    boolean primary key default true,
  eyebrow               text not null default '',
  title                 text not null default '',
  description           text not null default '',
  hero_image            text not null default '/images/store/xavier-category-clothing.webp',
  announcement_enabled  boolean not null default false,
  announcement          text not null default '',
  whatsapp              text not null default '',
  instagram             text not null default '',
  address               text not null default '',
  opening_hours         text not null default '',
  seo_title             text not null default '',
  seo_description       text not null default '',
  updated_at            timestamptz not null default now(),

  constraint store_settings_singleton check (id),
  constraint store_settings_eyebrow_valid check (char_length(eyebrow) <= 120),
  constraint store_settings_title_valid check (char_length(title) <= 160),
  constraint store_settings_description_valid check (char_length(description) <= 600),
  constraint store_settings_hero_image_valid check (hero_image ~ '^(/[^/]|https://)' and char_length(hero_image) <= 600),
  constraint store_settings_announcement_valid check (char_length(announcement) <= 200),
  constraint store_settings_whatsapp_valid check (
    whatsapp = ''
    or (char_length(whatsapp) <= 40 and char_length(regexp_replace(whatsapp, '\D', '', 'g')) between 10 and 15)
  ),
  constraint store_settings_instagram_valid check (char_length(instagram) <= 80),
  constraint store_settings_address_valid check (char_length(address) <= 240),
  constraint store_settings_opening_hours_valid check (char_length(opening_hours) <= 160),
  constraint store_settings_seo_title_valid check (char_length(seo_title) <= 120),
  constraint store_settings_seo_description_valid check (char_length(seo_description) <= 320)
);

comment on table public.store_settings is 'Conteúdo editável da vitrine (linha única, id = true).';

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();
