// Testa as migrations de supabase/migrations num Postgres real (PGlite, em memória).
//
// O que é real: o SQL das migrations, o motor do Postgres, RLS, grants, constraints, funções.
// O que é simulado (stubs mínimos e fiéis): schemas auth/storage, roles anon/authenticated/
// service_role e auth.uid() lendo request.jwt.claims — exatamente como o PostgREST faz.
//
// Não substitui um teste contra o projeto Supabase remoto; valida que o SQL está correto
// e que a RLS se comporta como projetado. Uso: npm run db:test

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TRANSACTION_COLUMNS } from "../lib/finance/columns.ts";
import {
  ADMIN_PRODUCT_COLUMNS,
  CATEGORY_COLUMNS,
  PUBLIC_PRODUCT_COLUMNS,
  STORE_SETTINGS_COLUMNS,
} from "../lib/store/columns.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// DB_TEST_MIGRATIONS_DIR permite apontar para cópias sabotadas (teste de mutação do próprio harness).
const MIGRATIONS_DIR = process.env.DB_TEST_MIGRATIONS_DIR ?? path.join(ROOT, "supabase", "migrations");
const ADMIN_EMAIL = "xaviercollection83@gmail.com";

const ID = {
  admin: "00000000-0000-4000-8000-0000000000a1",
  user: "00000000-0000-4000-8000-0000000000b2",
  pending: "00000000-0000-4000-8000-0000000000c3",
};

const STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    email_confirmed_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(
      coalesce(
        current_setting('request.jwt.claim.sub', true),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      ), ''
    )::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    metadata jsonb,
    created_at timestamptz default now()
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language plpgsql as $$
  declare _parts text[];
  begin
    select string_to_array(name, '/') into _parts;
    return _parts[1:array_length(_parts, 1) - 1];
  end
  $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;
  grant select on storage.buckets to anon, authenticated, service_role;
  grant execute on function storage.foldername(text) to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
`;

// Projetos Supabase antigos concediam ALL por padrão em tudo que nasce no schema public.
const LEGACY_DEFAULT_PRIVILEGES = `
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const ANON = { role: "anon" };
const USER = { role: "authenticated", claims: { sub: ID.user, role: "authenticated" } };
const ADMIN = { role: "authenticated", claims: { sub: ID.admin, role: "authenticated" } };
const SERVICE = { role: "service_role" };

async function as(db, who, sql, params = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    who.claims ? JSON.stringify(who.claims) : "",
  ]);
  await db.exec(`set role ${who.role}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

async function expectCode(promise, code, label) {
  try {
    await promise;
  } catch (error) {
    assert.equal(error.code, code, `${label}: esperado ${code}, veio ${error.code} (${error.message})`);
    return;
  }
  assert.fail(`${label}: era esperado erro ${code}, mas a operação passou`);
}

const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

async function buildDatabase({ legacyDefaults }) {
  const db = new PGlite();
  await db.exec(STUBS);
  if (legacyDefaults) await db.exec(LEGACY_DEFAULT_PRIVILEGES);
  for (const file of migrationFiles) {
    try {
      await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
    } catch (error) {
      throw new Error(`Falha aplicando ${file}: ${error.message}`);
    }
  }
  return db;
}

let passed = 0;
const failures = [];
async function test(flavor, name, fn) {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failures.push({ flavor, name, error });
  }
}

async function runSuite(flavor, { legacyDefaults }) {
  const db = await buildDatabase({ legacyDefaults });
  const t = (name, fn) => test(flavor, name, () => fn(db));

  // Fixtures (superusuário, fora da RLS)
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at) values
      ('${ID.admin}',   '${ADMIN_EMAIL.toUpperCase()}', now()),
      ('${ID.user}',    'cliente@example.com', now()),
      ('${ID.pending}', 'pendente@example.com', null);

    insert into public.categories (name, slug, sort_order, is_visible) values ('Oculta', 'oculta', 99, false);

    insert into public.products (slug, brand, name, category_id, price, image_url, status, stock)
      select 'fixture-rascunho', 'X', 'Rascunho', id, 10, '/images/a.webp', 'draft', 3
        from public.categories where slug = 'camisas';
    insert into public.products (slug, brand, name, category_id, price, image_url, status, stock)
      select 'fixture-categoria-oculta', 'X', 'Em categoria oculta', id, 10, '/images/a.webp', 'active', 4
        from public.categories where slug = 'oculta';
  `);

  const categoryId = async (slug) =>
    (await db.query("select id from public.categories where slug = $1", [slug])).rows[0].id;
  // status 'active' + sem RETURNING por padrão: assim, se um não-admin for barrado, a causa só
  // pode ser a policy de INSERT (RETURNING dispararia também a policy de SELECT e mascararia).
  const validProduct = async (overrides = {}, { returning = false } = {}) => {
    const base = {
      slug: `novo-${Math.random().toString(36).slice(2, 8)}`,
      brand: "Xavier",
      name: "Produto de teste",
      category_id: await categoryId("camisas"),
      price: 100,
      image_url: "/images/store/xavier-category-clothing.webp",
      status: "active",
      ...overrides,
    };
    const keys = Object.keys(base);
    return {
      sql: `insert into public.products (${keys.join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")})${returning ? " returning id" : ""}`,
      params: keys.map((k) => base[k]),
    };
  };
  const stockSnapshot = async () =>
    JSON.stringify((await db.query("select id, stock from public.products order by id")).rows);

  // ---- Estrutura / seed --------------------------------------------------
  await t("migrations aplicam e a seed carrega 9 categorias, 19+2 produtos e 1 configuração", async () => {
    const one = async (sql) => Number((await db.query(sql)).rows[0].n);
    assert.equal(await one("select count(*) n from public.categories where slug <> 'oculta'"), 9);
    assert.equal(await one("select count(*) n from public.products where slug not like 'fixture-%'"), 19);
    assert.equal(await one("select count(*) n from public.store_settings"), 1);
  });

  await t("categories.product_type: seed inicial classificada, default 'generic' e CHECK rejeita valor fora da lista", async () => {
    const typeOf = async (slug) =>
      (await db.query("select product_type from public.categories where slug = $1", [slug])).rows[0].product_type;
    assert.equal(await typeOf("perfumes"), "perfume");
    assert.equal(await typeOf("camisas"), "clothing");
    assert.equal(await typeOf("casacos"), "clothing");
    assert.equal(await typeOf("calcas"), "clothing");
    assert.equal(await typeOf("shorts"), "clothing");
    assert.equal(await typeOf("roupas-de-academia"), "clothing");
    assert.equal(await typeOf("chapeus-e-bones"), "accessory");
    assert.equal(await typeOf("oculos"), "glasses");
    assert.equal(await typeOf("sapatos"), "footwear");

    // Categoria nova sem tipo explícito cai no default 'generic' (não quebra, não força escolha).
    await db.exec("insert into public.categories (name, slug) values ('Bolsas', 'bolsas')");
    assert.equal(await typeOf("bolsas"), "generic");
    await db.exec("delete from public.categories where slug = 'bolsas'");

    await expectCode(
      db.query("insert into public.categories (name, slug, product_type) values ('X', 'x-teste', 'roupa')"),
      "23514",
      "product_type fora da lista controlada",
    );
  });

  await t("seed é idempotente e não sobrescreve edições do lojista", async () => {
    await db.exec("update public.products set price = 1.11 where slug = 'zara-camisa-signature'");
    const seed = readFileSync(
      path.join(MIGRATIONS_DIR, migrationFiles.find((f) => f.includes("seed_catalog"))),
      "utf8",
    );
    await db.exec(seed);
    const { rows } = await db.query("select price from public.products where slug = 'zara-camisa-signature'");
    assert.equal(Number(rows[0].price), 1.11);
    const count = await db.query("select count(*) n from public.products where slug not like 'fixture-%'");
    assert.equal(Number(count.rows[0].n), 19);
    await db.exec("update public.products set price = 239.90 where slug = 'zara-camisa-signature'");
  });

  await t("RLS está habilitada em todas as tabelas do app", async () => {
    const { rows } = await db.query(`
      select relname, relrowsecurity from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r'`);
    assert.deepEqual(
      rows.map((r) => r.relname).sort(),
      ["admin_users", "categories", "financial_transactions", "products", "store_settings"],
    );
    for (const row of rows) assert.equal(row.relrowsecurity, true, `${row.relname} sem RLS`);
  });

  await t("listas de colunas de lib/store/columns.ts e lib/finance/columns.ts existem no schema migrado", async () => {
    const columnsOf = async (table) =>
      new Set((await db.query(
        "select column_name from information_schema.columns where table_schema='public' and table_name=$1",
        [table],
      )).rows.map((r) => r.column_name));
    const products = await columnsOf("products");
    for (const col of ADMIN_PRODUCT_COLUMNS) assert.ok(products.has(col), `products.${col} não existe`);
    const categories = await columnsOf("categories");
    for (const col of CATEGORY_COLUMNS) assert.ok(categories.has(col), `categories.${col} não existe`);
    const settings = await columnsOf("store_settings");
    for (const col of STORE_SETTINGS_COLUMNS) assert.ok(settings.has(col), `store_settings.${col} não existe`);
    const transactions = await columnsOf("financial_transactions");
    for (const col of TRANSACTION_COLUMNS) assert.ok(transactions.has(col), `financial_transactions.${col} não existe`);
  });

  await t("auditoria de grants: anon só lê; authenticated não tem TRUNCATE/REFERENCES/TRIGGER", async () => {
    const grants = (await db.query(`
      select grantee, table_name, privilege_type from information_schema.role_table_grants
       where table_schema = 'public' and grantee in ('anon', 'authenticated')`)).rows;
    const anon = grants.filter((g) => g.grantee === "anon");
    assert.deepEqual(
      anon.map((g) => `${g.table_name}:${g.privilege_type}`).sort(),
      ["categories:SELECT", "store_settings:SELECT"],
    );
    for (const g of grants.filter((x) => x.grantee === "authenticated")) {
      assert.ok(!["TRUNCATE", "REFERENCES", "TRIGGER"].includes(g.privilege_type), `${g.table_name}:${g.privilege_type}`);
    }
    const authenticated = new Set(
      grants.filter((g) => g.grantee === "authenticated").map((g) => `${g.table_name}:${g.privilege_type}`),
    );
    assert.ok(!authenticated.has("admin_users:INSERT") && !authenticated.has("admin_users:UPDATE") && !authenticated.has("admin_users:DELETE"));
    assert.ok(!authenticated.has("store_settings:INSERT") && !authenticated.has("store_settings:DELETE"));
  });

  // ---- anon --------------------------------------------------------------
  await t("anon lê apenas produtos publicados em categorias visíveis", async () => {
    const { rows } = await as(db, ANON, `select ${PUBLIC_PRODUCT_COLUMNS.join(", ")} from public.products`);
    const slugs = rows.map((r) => r.slug);
    assert.equal(rows.length, 19);
    assert.ok(!slugs.includes("fixture-rascunho"), "rascunho vazou para anon");
    assert.ok(!slugs.includes("fixture-categoria-oculta"), "produto de categoria oculta vazou para anon");
    assert.ok(rows.some((r) => r.status === "out-of-stock"), "produtos esgotados devem continuar visíveis");
  });

  await t("anon vê só categorias visíveis e a configuração da loja", async () => {
    const cats = await as(db, ANON, "select slug from public.categories");
    assert.equal(cats.rows.length, 9);
    assert.ok(!cats.rows.some((r) => r.slug === "oculta"));
    const settings = await as(db, ANON, `select ${STORE_SETTINGS_COLUMNS.join(", ")} from public.store_settings`);
    assert.equal(settings.rows.length, 1);
    assert.equal(settings.rows[0].title, "Vista sua presença.");
  });

  await t("anon lê products.stock e volume_ml (necessário para a sacola no navegador)", async () => {
    // A sacola roda inteiramente no cliente, sem checkout no servidor: a vitrine precisa do
    // estoque para não deixar a quantidade passar do limite (migration 20260922090000). Com
    // essas duas colunas liberadas, todas as colunas de products já eram concedidas ao anon
    // (created_at/updated_at já estavam no grant original) — select * passa a funcionar.
    const stock = await as(db, ANON, "select stock from public.products limit 1");
    assert.equal(stock.rows.length, 1);
    const volume = await as(db, ANON, "select volume_ml from public.products limit 1");
    assert.equal(volume.rows.length, 1);
    const wildcard = await as(db, ANON, "select * from public.products limit 1");
    assert.equal(wildcard.rows.length, 1);
  });

  await t("anon não escreve em nada e não chama funções administrativas", async () => {
    const insert = await validProduct();
    await expectCode(as(db, ANON, insert.sql, insert.params), "42501", "insert product");
    await expectCode(as(db, ANON, "update public.products set price = 1"), "42501", "update product");
    await expectCode(as(db, ANON, "delete from public.products"), "42501", "delete product");
    await expectCode(as(db, ANON, "update public.categories set is_visible = false"), "42501", "update category");
    await expectCode(as(db, ANON, "update public.store_settings set title = 'hack'"), "42501", "update settings");
    await expectCode(as(db, ANON, "select * from public.admin_users"), "42501", "admin_users");
    await expectCode(as(db, ANON, "select public.is_admin()"), "42501", "is_admin");
    await expectCode(as(db, ANON, "select public.promote_admin('cliente@example.com')"), "42501", "promote_admin");
    await expectCode(as(db, ANON, "select public.reorder_categories(array[]::uuid[])"), "42501", "reorder_categories");
    await expectCode(as(db, ANON, "select public.set_product_featured(gen_random_uuid(), true)"), "42501", "set_product_featured");
  });

  // ---- authenticated sem ser admin --------------------------------------
  await t("usuário autenticado não-admin não é admin, não vê rascunhos e não escreve", async () => {
    const isAdmin = await as(db, USER, "select public.is_admin() as v");
    assert.equal(isAdmin.rows[0].v, false);

    const rows = (await as(db, USER, "select slug from public.products")).rows.map((r) => r.slug);
    assert.ok(!rows.includes("fixture-rascunho") && !rows.includes("fixture-categoria-oculta"));

    const insert = await validProduct();
    await expectCode(as(db, USER, insert.sql, insert.params), "42501", "insert product (RLS)");
    const leaked = await db.query("select count(*) n from public.products where slug = $1", [insert.params[0]]);
    assert.equal(Number(leaked.rows[0].n), 0, "insert por não-admin foi persistido");
    await expectCode(
      as(db, USER, "insert into public.categories (name, slug) values ('Hack', 'hack')"),
      "42501",
      "insert category (RLS)",
    );

    const before = await stockSnapshot();
    const update = await as(db, USER, "update public.products set price = 0.01");
    assert.equal(update.affectedRows ?? 0, 0, "update por não-admin alterou linhas");
    const del = await as(db, USER, "delete from public.products");
    assert.equal(del.affectedRows ?? 0, 0, "delete por não-admin removeu linhas");
    const settings = await as(db, USER, "update public.store_settings set title = 'hack'");
    assert.equal(settings.affectedRows ?? 0, 0);
    assert.equal(await stockSnapshot(), before);
    const price = await db.query("select count(*) n from public.products where price = 0.01");
    assert.equal(Number(price.rows[0].n), 0);
  });

  await t("usuário autenticado não pode se autopromover", async () => {
    await expectCode(
      as(db, USER, "insert into public.admin_users (user_id, email) values ($1, 'cliente@example.com')", [ID.user]),
      "42501",
      "insert admin_users",
    );
    await expectCode(as(db, USER, "select public.promote_admin('cliente@example.com')"), "42501", "promote_admin");
    await expectCode(as(db, USER, "select public.revoke_admin('cliente@example.com')"), "42501", "revoke_admin");
    const own = await as(db, USER, "select * from public.admin_users");
    assert.equal(own.rows.length, 0);
  });

  await t("RPCs administrativas chamadas por não-admin não alteram nada (RLS invoker)", async () => {
    const cats = (await db.query("select id from public.categories where slug in ('camisas','casacos') order by slug")).rows.map((r) => r.id);
    const before = JSON.stringify((await db.query("select id, sort_order from public.categories order by id")).rows);
    await as(db, USER, "select public.reorder_categories($1::uuid[])", [cats.reverse()]);
    assert.equal(JSON.stringify((await db.query("select id, sort_order from public.categories order by id")).rows), before);
    const product = (await db.query("select id from public.products where slug = 'zara-camisa-signature'")).rows[0].id;
    await as(db, USER, "select public.set_product_featured($1, false)", [product]);
    const row = (await db.query("select is_featured from public.products where id = $1", [product])).rows[0];
    assert.equal(row.is_featured, true);
  });

  // ---- promoção de admin -------------------------------------------------
  await t("promote_admin: rejeita usuário inexistente e e-mail não confirmado", async () => {
    await expectCode(db.query("select public.promote_admin('fantasma@example.com')"), "P0002", "usuário inexistente");
    await expectCode(db.query("select public.promote_admin('pendente@example.com')"), "P0001", "e-mail não confirmado");
    const { rows } = await db.query("select count(*) n from public.admin_users");
    assert.equal(Number(rows[0].n), 0);
  });

  await t("promote_admin promove (case-insensitive) e é idempotente", async () => {
    const first = await db.query(`select public.promote_admin('  ${ADMIN_EMAIL}  ') as id`);
    assert.equal(first.rows[0].id, ID.admin);
    await db.query(`select public.promote_admin('${ADMIN_EMAIL}')`);
    const { rows } = await db.query("select user_id, email from public.admin_users");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, ADMIN_EMAIL);
  });

  // ---- admin -------------------------------------------------------------
  await t("admin é reconhecido, enxerga tudo (rascunhos, categoria oculta, stock) e sua linha em admin_users", async () => {
    assert.equal((await as(db, ADMIN, "select public.is_admin() as v")).rows[0].v, true);
    const products = (await as(db, ADMIN, `select ${ADMIN_PRODUCT_COLUMNS.join(", ")} from public.products`)).rows;
    assert.equal(products.length, 21);
    assert.ok(products.every((p) => typeof p.stock === "number"));
    assert.equal((await as(db, ADMIN, "select slug from public.categories")).rows.length, 10);
    assert.equal((await as(db, ADMIN, "select * from public.admin_users")).rows.length, 1);
    // Agora que existe um admin: quem não é admin não pode enxergar essa linha.
    assert.equal((await as(db, USER, "select * from public.admin_users")).rows.length, 0, "usuário comum viu admin_users");
  });

  await t("admin cria, edita e remove produto", async () => {
    const insert = await validProduct(
      {
        original_price: 150,
        image_position: "30% 82%",
        colors: JSON.stringify([{ name: "Preto", hex: "#111111" }]),
        sizes: ["P", "M"],
        badge: "novo",
        status: "active",
        stock: 7,
      },
      { returning: true },
    );
    const created = (await as(db, ADMIN, insert.sql, insert.params)).rows[0].id;
    const updated = await as(db, ADMIN, "update public.products set price = 120, stock = 9 where id = $1 returning updated_at, created_at", [created]);
    assert.equal(updated.rows.length, 1);
    assert.ok(updated.rows[0].updated_at >= updated.rows[0].created_at, "trigger updated_at");
    const removed = await as(db, ADMIN, "delete from public.products where id = $1", [created]);
    assert.equal(removed.affectedRows, 1);
  });

  await t("constraints rejeitam dados inválidos (23514)", async () => {
    const bad = async (overrides, label) => {
      const q = await validProduct(overrides);
      await expectCode(as(db, ADMIN, q.sql, q.params), "23514", label);
    };
    await bad({ price: -1 }, "preço negativo");
    await bad({ original_price: 100, price: 100 }, "preço anterior igual ao preço");
    await bad({ original_price: 50, price: 100 }, "preço anterior menor");
    await bad({ image_url: "javascript:alert(1)" }, "image_url javascript:");
    await bad({ image_url: "//evil.example/x.png" }, "image_url protocol-relative");
    await bad({ image_url: "http://insegura.example/x.png" }, "image_url http");
    await bad({ image_position: "url(x)" }, "image_position inválida");
    await bad({ image_fit: "stretch" }, "image_fit inválido");
    await bad({ colors: JSON.stringify([{ name: "Sem hex" }]) }, "cor sem hex");
    await bad({ colors: JSON.stringify([{ name: "Ruim", hex: "red" }]) }, "hex inválido");
    await bad({ colors: JSON.stringify({ name: "x" }) }, "colors não-array");
    await bad({ sizes: [] }, "sizes vazio");
    await bad({ sizes: ["P", ""] }, "size em branco");
    await bad({ badge: "promocao" }, "badge inválido");
    await bad({ status: "published" }, "status inválido");
    await bad({ stock: -1 }, "estoque negativo");
    await bad({ name: "   " }, "nome em branco");
    await bad({ slug: "Slug Inválido" }, "slug inválido");
    const dup = await validProduct({ slug: "zara-camisa-signature" });
    await expectCode(as(db, ADMIN, dup.sql, dup.params), "23505", "slug duplicado");
    const orphan = await validProduct({ category_id: "00000000-0000-4000-8000-00000000ffff" });
    await expectCode(as(db, ADMIN, orphan.sql, orphan.params), "23503", "categoria inexistente");
  });

  await t("volume_ml: opcional, aceita inteiro positivo e rejeita valor inválido (23514)", async () => {
    const ok = await validProduct({ volume_ml: 100 });
    await as(db, ADMIN, ok.sql, ok.params);
    const zero = await validProduct({ volume_ml: 0 });
    await expectCode(as(db, ADMIN, zero.sql, zero.params), "23514", "volume_ml = 0");
    const negative = await validProduct({ volume_ml: -1 });
    await expectCode(as(db, ADMIN, negative.sql, negative.params), "23514", "volume_ml negativo");
  });

  await t("categoria com produtos não pode ser removida (on delete restrict)", async () => {
    // 23001 = restrict_violation (ON DELETE RESTRICT), distinto de 23503 (foreign_key_violation).
    await expectCode(as(db, ADMIN, "delete from public.categories where slug = 'camisas'"), "23001", "delete category");
  });

  await t("admin atualiza a configuração da loja; whatsapp inválido é rejeitado", async () => {
    await as(db, ADMIN, "update public.store_settings set title = 'Novo título', whatsapp = '+55 (83) 8893-3979'");
    await expectCode(as(db, ADMIN, "update public.store_settings set whatsapp = '123'"), "23514", "whatsapp curto");
    await expectCode(as(db, ADMIN, "update public.store_settings set hero_image = 'data:image/png;base64,AAAA'"), "23514", "hero_image data:");
    await as(db, ADMIN, "update public.store_settings set title = 'Vista sua presença.'");
    await expectCode(as(db, ADMIN, "insert into public.store_settings (id) values (false)"), "42501", "insert settings sem grant");
    await expectCode(as(db, ADMIN, "delete from public.store_settings"), "42501", "delete settings sem grant");
  });

  await t("RPCs administrativas funcionam para admin e NUNCA alteram estoque", async () => {
    const before = await stockSnapshot();

    const cats = (await db.query("select id from public.categories where slug in ('camisas','casacos','sapatos') order by slug")).rows.map((r) => r.id);
    await as(db, ADMIN, "select public.reorder_categories($1::uuid[])", [[...cats].reverse()]);
    const order = (await db.query("select sort_order from public.categories where id = any($1::uuid[]) order by sort_order", [cats])).rows.map((r) => r.sort_order);
    assert.deepEqual(order, [0, 1, 2]);

    const target = (await db.query("select id from public.products where slug = 'crosby-calca-tailored'")).rows[0].id;
    await as(db, ADMIN, "select public.set_product_featured($1, true)", [target]);
    let row = (await db.query("select is_featured, featured_rank from public.products where id = $1", [target])).rows[0];
    assert.equal(row.is_featured, true);
    const max = Number((await db.query("select max(featured_rank) m from public.products")).rows[0].m);
    assert.equal(row.featured_rank, max);

    const featured = (await db.query("select id from public.products where is_featured order by featured_rank, slug")).rows.map((r) => r.id);
    await as(db, ADMIN, "select public.reorder_featured($1::uuid[])", [[...featured].reverse()]);
    row = (await db.query("select featured_rank from public.products where id = $1", [featured[0]])).rows[0];
    assert.equal(row.featured_rank, featured.length);

    await as(db, ADMIN, "select public.set_product_featured($1, false)", [target]);
    row = (await db.query("select is_featured, featured_rank from public.products where id = $1", [target])).rows[0];
    assert.equal(row.is_featured, false);
    assert.equal(row.featured_rank, null);

    assert.equal(await stockSnapshot(), before, "alguma operação alterou o estoque");
  });

  await t("admin não consegue editar admin_users nem promover pela API", async () => {
    await expectCode(
      as(db, ADMIN, "insert into public.admin_users (user_id, email) values ($1, 'x@example.com')", [ID.user]),
      "42501",
      "insert admin_users",
    );
    await expectCode(as(db, ADMIN, "select public.promote_admin('cliente@example.com')"), "42501", "promote_admin");
  });

  // ---- financial_transactions ---------------------------------------------
  // Ao contrário de products/categories, NÃO existe policy pública aqui: nem select. É
  // informação administrativa (ver 20260922180000_financial_transactions.sql).
  const validTransaction = (overrides = {}) => {
    const base = {
      type: "sale",
      description: "Venda de teste",
      amount: 100,
      status: "paid",
      transaction_date: "2026-09-22",
      ...overrides,
    };
    const keys = Object.keys(base);
    return {
      sql: `insert into public.financial_transactions (${keys.join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
      params: keys.map((k) => base[k]),
    };
  };

  await t("anon e usuário comum não leem nem escrevem financial_transactions (é dado administrativo, sem policy pública)", async () => {
    // anon não tem NENHUM grant na tabela: falha por falta de privilégio (42501), antes de a
    // RLS entrar em jogo.
    await expectCode(as(db, ANON, "select * from public.financial_transactions"), "42501", "anon select");
    // usuário comum TEM grant (authenticated), mas a policy usa is_admin(): SELECT sob RLS não
    // lança erro, só filtra — a linha simplesmente não aparece pra quem não é admin.
    const seen = await as(db, USER, "select * from public.financial_transactions");
    assert.equal(seen.rows.length, 0, "usuário comum enxergou alguma movimentação financeira");

    const insert = await validTransaction();
    await expectCode(as(db, ANON, insert.sql, insert.params), "42501", "anon insert");
    // INSERT/UPDATE/DELETE que violam a policy SÃO rejeitados com erro (WITH CHECK falhou).
    await expectCode(as(db, USER, insert.sql, insert.params), "42501", "usuário comum insert");
  });

  await t("admin registra, edita, dá baixa e remove uma movimentação financeira", async () => {
    const insert = await validTransaction({ status: "pending", due_date: "2026-09-30" });
    const created = (await as(db, ADMIN, insert.sql, insert.params)).rows[0].id;

    const updated = await as(
      db,
      ADMIN,
      "update public.financial_transactions set status = 'paid' where id = $1 returning status, updated_at, created_at",
      [created],
    );
    assert.equal(updated.rows[0].status, "paid");
    assert.ok(updated.rows[0].updated_at >= updated.rows[0].created_at, "trigger updated_at");

    const selected = await as(db, ADMIN, "select count(*) n from public.financial_transactions where id = $1", [created]);
    assert.equal(Number(selected.rows[0].n), 1);

    const removed = await as(db, ADMIN, "delete from public.financial_transactions where id = $1", [created]);
    assert.equal(removed.affectedRows, 1);
  });

  await t("financial_transactions: constraints rejeitam type/status/amount/description inválidos (23514)", async () => {
    const bad = async (overrides, label) => {
      const q = validTransaction(overrides);
      await expectCode(as(db, ADMIN, q.sql, q.params), "23514", label);
    };
    await bad({ type: "reembolso" }, "type inválido");
    await bad({ status: "cancelado" }, "status inválido");
    await bad({ amount: 0 }, "amount zero");
    await bad({ amount: -5 }, "amount negativo");
    await bad({ description: "   " }, "description em branco");
  });

  await t("service_role tem acesso total (uso exclusivo de servidor)", async () => {
    const insert = await validProduct({ slug: "via-service-role" });
    await as(db, SERVICE, insert.sql, insert.params);
    const { rows } = await as(db, SERVICE, "select count(*) n from public.products");
    assert.ok(Number(rows[0].n) >= 22);
    await as(db, SERVICE, "delete from public.products where slug = 'via-service-role'");
  });

  // ---- Storage -----------------------------------------------------------
  await t("bucket product-images: público, 5 MiB, apenas imagens", async () => {
    const { rows } = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'product-images'");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].public, true);
    assert.equal(Number(rows[0].file_size_limit), 5242880);
    assert.deepEqual([...rows[0].allowed_mime_types].sort(), ["image/avif", "image/jpeg", "image/png", "image/webp"]);
  });

  await t("Storage: anon e usuário comum não gravam nem listam; admin grava só em products/", async () => {
    const put = (who, name, bucket = "product-images") =>
      as(db, who, "insert into storage.objects (bucket_id, name, owner) values ($1, $2, (select auth.uid()))", [bucket, name]);

    await expectCode(put(ANON, "products/a.webp"), "42501", "anon upload");
    await expectCode(put(USER, "products/a.webp"), "42501", "usuário comum upload");

    await put(ADMIN, "products/a.webp");
    await expectCode(put(ADMIN, "outra-pasta/a.webp"), "42501", "admin fora de products/");
    // A policy (bucket_id = 'product-images') barra antes da FK: admin só escreve neste bucket.
    await expectCode(put(ADMIN, "products/a.webp", "outro-bucket"), "42501", "admin em outro bucket");

    assert.equal((await as(db, ANON, "select * from storage.objects")).rows.length, 0, "anon listou objetos");
    assert.equal((await as(db, USER, "select * from storage.objects")).rows.length, 0, "usuário comum listou objetos");
    assert.equal((await as(db, ADMIN, "select * from storage.objects")).rows.length, 1);

    const upd = await as(db, USER, "update storage.objects set name = 'products/b.webp'");
    assert.equal(upd.affectedRows ?? 0, 0, "usuário comum renomeou objeto");
    const del = await as(db, USER, "delete from storage.objects");
    assert.equal(del.affectedRows ?? 0, 0, "usuário comum removeu objeto");

    const adminUpd = await as(db, ADMIN, "update storage.objects set name = 'products/b.webp'");
    assert.equal(adminUpd.affectedRows, 1);
    await expectCode(as(db, ADMIN, "update storage.objects set name = 'fora/b.webp'"), "42501", "admin mover para fora de products/");
    const adminDel = await as(db, ADMIN, "delete from storage.objects");
    assert.equal(adminDel.affectedRows, 1);
  });

  await db.close();
}

const FLAVORS = [
  ["grants padrão legados (anon/authenticated com ALL por default)", { legacyDefaults: true }],
  ["projeto novo (sem default privileges)", { legacyDefaults: false }],
];

for (const [name, options] of FLAVORS) {
  console.log(`\n▶ ${name}`);
  const before = passed;
  const failedBefore = failures.length;
  await runSuite(name, options);
  console.log(`   ${passed - before} passaram, ${failures.length - failedBefore} falharam`);
}

console.log(`\nTotal: ${passed} passaram, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const { flavor, name, error } of failures) {
    console.error(`\n✗ [${flavor}] ${name}\n  ${error.message}`);
  }
  process.exit(1);
}
