# Backend Supabase — Xavier Collection

Projeto: `ietpgxanyhwmmgxwjirt` · Admin: `xaviercollection83@gmail.com`

**Regras de negócio**

- A venda **não** é registrada no banco. O checkout só abre `https://wa.me/558388933979` com a mensagem do pedido.
- O estoque é **manual**: nada (sacola, WhatsApp, funções SQL) altera `products.stock`. Só o lojista, no painel.

## O que existe

| Migration | Conteúdo |
|---|---|
| `20260921120000_store_schema.sql` | `categories`, `products`, `store_settings`, constraints e triggers de `updated_at` |
| `20260921120100_admin_access.sql` | `admin_users`, `is_admin()`, `promote_admin()` / `revoke_admin()` |
| `20260921120200_rls_and_grants.sql` | RLS ligada em todas as tabelas, grants mínimos e policies |
| `20260921120300_admin_rpc.sql` | `reorder_categories`, `reorder_featured`, `set_product_featured` (SECURITY INVOKER) |
| `20260921120400_storage_product_images.sql` | bucket público `product-images` (5 MiB, só imagens) + policies de admin |
| `20260921120500_seed_catalog.sql` | catálogo inicial **gerado** de `lib/storeCatalog.ts` (`npm run db:seed:generate`); idempotente |

Modelo de acesso: `anon` lê só o catálogo publicado (e **não** lê `stock`); escrita apenas para quem está em `admin_users`.
Chaves secretas (`service_role`, `sb_secret_*`) nunca entram no front-end; o build falha se uma estiver em `NEXT_PUBLIC_*`.

## 1. Aplicar as migrations no projeto remoto

Rode **no seu terminal** (o token e a senha do banco ficam só na sua máquina — não cole no chat):

```bash
npx supabase login          # entre com a conta que É DONA do projeto ietpgxanyhwmmgxwjirt
npm run db:link             # pede a senha do banco (Project Settings > Database)
npm run db:push             # aplica as 6 migrations em ordem
```

Sem CLI? No painel do Supabase abra **SQL Editor** e execute cada arquivo de `supabase/migrations/`, na ordem da tabela acima.

Cadastro público desligado (recomendado): **Authentication > Sign In / Providers > "Allow new users to sign up" = desligado** e
"Confirm email" ligado. O `supabase/config.toml` já traz isso (`npx supabase config push` aplica; revise o diff antes de confirmar).

## 2. Criar e promover o administrador

1. **Authentication > Users > Add user**: e-mail `xaviercollection83@gmail.com`, senha forte de sua escolha
   (mín. 10 caracteres, com maiúscula, minúscula e número) e marque **Auto Confirm User**.
2. No **SQL Editor**:
   ```sql
   select public.promote_admin('xaviercollection83@gmail.com');
   ```
3. Conferir: `select email from public.admin_users;` deve listar o e-mail.

Não existe promoção automática de propósito: só quem tem acesso privilegiado ao banco promove alguém.
Para remover: `select public.revoke_admin('email@exemplo.com');`

## 3. Variáveis de ambiente (`.env.local`, nunca versionado)

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://ietpgxanyhwmmgxwjirt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave publicável: Project Settings > API Keys>
```

Depois `npm run dev`: a loja fica em `/loja` e o painel em `/admin` (redireciona para `/admin/login`).

## 4. Testes

```bash
npm run db:test   # migrations + RLS + grants + Storage num Postgres real (PGlite), 2 cenários de default privileges
npm test          # WhatsApp, validação, mapeadores, guarda de chave
npm run lint && npm run build
```

`db:test` valida o SQL e o comportamento da RLS com stubs de `auth`/`storage`. Ele **não** substitui testar contra o
projeto remoto (login real, upload real): faça o roteiro da seção 5 depois de aplicar.

## 5. Roteiro de validação no projeto remoto

1. Anônimo: `/loja` mostra os 19 produtos e as 9 categorias.
2. `/admin` sem login redireciona para `/admin/login`.
3. Login com o admin → painel abre; "Sair" volta ao login.
4. Editar preço/estoque de um produto e ver a mudança em `/loja`.
5. Enviar uma imagem em "Novo produto" (JPG/PNG/WebP/AVIF ≤ 5 MB) e ver a URL `.../storage/v1/object/public/product-images/products/...`.
6. Ocultar uma categoria e ver sumir da loja (com os produtos dela).
7. Adicionar itens à sacola → "Continuar atendimento" abre o WhatsApp com produtos, tamanhos/volumes, quantidades, subtotais e total; conferir que o estoque **não** mudou.

## 6. Deploy (só depois da seção 5)

Vercel: definir as 3 variáveis acima (produção: `NEXT_PUBLIC_SITE_URL=https://xaviercollection.com.br`) e, no Supabase,
incluir `https://xaviercollection.com.br` em **Authentication > URL Configuration**. Domínio e DNS por último.
