-- Remove o alerta de SECURITY DEFINER exposto sem perder a checagem de admin:
-- authenticated já possui SELECT em admin_users e a RLS permite apenas a própria linha.
alter function public.is_admin() security invoker;

-- Uma única policy permissiva por papel/ação evita avaliar duas policies em cada SELECT.
drop policy categories_select_visible on public.categories;
drop policy categories_select_admin on public.categories;

create policy categories_select_visible
  on public.categories for select
  to anon
  using (is_visible);

create policy categories_select_authenticated
  on public.categories for select
  to authenticated
  using (
    is_visible
    or (select public.is_admin())
  );

drop policy products_select_public on public.products;
drop policy products_select_admin on public.products;

create policy products_select_public
  on public.products for select
  to anon
  using (
    status in ('active', 'out-of-stock')
    and exists (
      select 1
        from public.categories c
       where c.id = products.category_id
         and c.is_visible
    )
  );

create policy products_select_authenticated
  on public.products for select
  to authenticated
  using (
    (
      status in ('active', 'out-of-stock')
      and exists (
        select 1
          from public.categories c
         where c.id = products.category_id
           and c.is_visible
      )
    )
    or (select public.is_admin())
  );
