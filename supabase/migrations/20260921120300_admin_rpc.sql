-- Xavier Collection — operações administrativas atômicas.
--
-- Todas são SECURITY INVOKER: rodam com os privilégios de quem chama, então a
-- RLS de categories/products continua valendo (não-admin não altera nenhuma linha).
-- Nenhuma delas mexe em products.stock.

create or replace function public.reorder_categories(p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.categories c
     set sort_order = (o.ord - 1)::integer
    from unnest(p_ids) with ordinality as o(id, ord)
   where c.id = o.id;
$$;

-- Reordena os destaques: p_ids na ordem desejada vira featured_rank 1..n.
create or replace function public.reorder_featured(p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.products p
     set is_featured = true,
         featured_rank = o.ord::integer
    from unnest(p_ids) with ordinality as o(id, ord)
   where p.id = o.id;
$$;

-- Liga/desliga destaque. Ao ligar, entra no fim (maior rank + 1); ao desligar, perde o rank.
create or replace function public.set_product_featured(p_id uuid, p_featured boolean)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.products p
     set is_featured = p_featured,
         featured_rank = case
           when p_featured then (select coalesce(max(x.featured_rank), 0) + 1 from public.products x)
           else null
         end
   where p.id = p_id;
$$;

revoke all on function public.reorder_categories(uuid[])            from public, anon;
revoke all on function public.reorder_featured(uuid[])              from public, anon;
revoke all on function public.set_product_featured(uuid, boolean)   from public, anon;

grant execute on function public.reorder_categories(uuid[])            to authenticated, service_role;
grant execute on function public.reorder_featured(uuid[])              to authenticated, service_role;
grant execute on function public.set_product_featured(uuid, boolean)   to authenticated, service_role;
