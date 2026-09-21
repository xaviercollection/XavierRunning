-- Xavier Collection — controle de acesso administrativo.
--
-- Autorização = pertencer a public.admin_users. Não existe caminho automático
-- de promoção (nada em trigger de auth.users): promover é um ato explícito,
-- feito por quem tem acesso privilegiado ao banco (SQL Editor / service_role):
--
--   select public.promote_admin('xaviercollection83@gmail.com');
--
-- Pré-requisito: o usuário já existir e ter e-mail confirmado (Authentication > Users).

create table public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now(),

  constraint admin_users_email_valid check (char_length(email) between 3 and 254)
);

comment on table public.admin_users is 'Administradores da loja. Escrita apenas via promote_admin()/revoke_admin() ou acesso privilegiado.';

-- Usado nas policies de RLS e no Storage. SECURITY DEFINER para conseguir ler
-- admin_users sem conceder leitura da tabela inteira aos papéis da API.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.admin_users a
     where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.promote_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id         uuid;
  v_email      text;
  v_confirmed  timestamptz;
begin
  select u.id, u.email, u.email_confirmed_at
    into v_id, v_email, v_confirmed
    from auth.users u
   where lower(u.email) = lower(btrim(p_email))
   limit 1;

  if v_id is null then
    raise exception 'Usuário "%" não existe. Crie-o em Authentication > Users antes de promover.', p_email
      using errcode = 'P0002';
  end if;

  if v_confirmed is null then
    raise exception 'O e-mail de "%" ainda não foi confirmado.', p_email
      using errcode = 'P0001';
  end if;

  insert into public.admin_users (user_id, email)
  values (v_id, lower(v_email))
  on conflict (user_id) do nothing;

  return v_id;
end;
$$;

create or replace function public.revoke_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.admin_users
   where lower(email) = lower(btrim(p_email));
end;
$$;

-- Nenhum papel da API (anon/authenticated) pode se autopromover.
revoke all on function public.promote_admin(text) from public, anon, authenticated;
revoke all on function public.revoke_admin(text) from public, anon, authenticated;
grant execute on function public.promote_admin(text) to service_role;
grant execute on function public.revoke_admin(text) to service_role;
