-- Xavier Collection — RLS e grants.
--
-- Modelo:
--   anon           -> lê catálogo público (produtos active/out-of-stock em categorias visíveis),
--                     categorias visíveis e store_settings. Não lê products.stock.
--   authenticated  -> mesma leitura pública; escrita SOMENTE se public.is_admin().
--   service_role   -> acesso total (uso exclusivo de servidor; nunca no navegador).
--
-- Os grants são explícitos: não dependemos de default privileges do projeto
-- (que variam entre projetos Supabase). Primeiro removemos tudo, depois concedemos o mínimo.

alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.store_settings  enable row level security;
alter table public.admin_users     enable row level security;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on table
  public.categories,
  public.products,
  public.store_settings,
  public.admin_users
from public, anon, authenticated;

-- Leitura pública. Em products, colunas explícitas: `stock` fica de fora para anon.
grant select on table public.categories     to anon, authenticated;
grant select on table public.store_settings to anon, authenticated;
grant select (
  id, slug, brand, name, description, category_id,
  price, original_price,
  image_url, image_position, image_fit,
  colors, sizes, badge, status,
  is_featured, featured_rank,
  created_at, updated_at
) on table public.products to anon;
grant select on table public.products to authenticated;

-- Escrita: a RLS abaixo restringe a administradores.
grant insert, update, delete on table public.categories to authenticated;
grant insert, update, delete on table public.products   to authenticated;
grant update                 on table public.store_settings to authenticated;

-- Cada usuário só enxerga a própria linha (para "sou admin?").
grant select on table public.admin_users to authenticated;

grant all on table
  public.categories,
  public.products,
  public.store_settings,
  public.admin_users
to service_role;

-- ---------------------------------------------------------------------------
-- Policies: categories
-- ---------------------------------------------------------------------------

create policy categories_select_visible
  on public.categories for select
  to anon, authenticated
  using (is_visible);

create policy categories_select_admin
  on public.categories for select
  to authenticated
  using ((select public.is_admin()));

create policy categories_insert_admin
  on public.categories for insert
  to authenticated
  with check ((select public.is_admin()));

create policy categories_update_admin
  on public.categories for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy categories_delete_admin
  on public.categories for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Policies: products
-- ---------------------------------------------------------------------------

create policy products_select_public
  on public.products for select
  to anon, authenticated
  using (
    status in ('active', 'out-of-stock')
    and exists (
      select 1
        from public.categories c
       where c.id = products.category_id
         and c.is_visible
    )
  );

create policy products_select_admin
  on public.products for select
  to authenticated
  using ((select public.is_admin()));

create policy products_insert_admin
  on public.products for insert
  to authenticated
  with check ((select public.is_admin()));

create policy products_update_admin
  on public.products for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy products_delete_admin
  on public.products for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Policies: store_settings
-- ---------------------------------------------------------------------------

create policy store_settings_select_public
  on public.store_settings for select
  to anon, authenticated
  using (true);

create policy store_settings_update_admin
  on public.store_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Policies: admin_users (somente a própria linha; sem insert/update/delete)
-- ---------------------------------------------------------------------------

create policy admin_users_select_self
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));
