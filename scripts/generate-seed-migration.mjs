// Gera supabase/migrations/20260921120500_seed_catalog.sql a partir de lib/storeCatalog.ts
// (o catálogo aprovado no front-end). Uso: npm run db:seed:generate
//
// A migration gerada é idempotente (on conflict do nothing): reexecutá-la nunca
// sobrescreve edições feitas pelo lojista no painel.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORE_CATEGORIES, STORE_PRODUCTS } from "../lib/storeCatalog.ts";

const OUTPUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "migrations",
  "20260921120500_seed_catalog.sql",
);

const BADGE_TO_DB = { Novo: "novo", Esgotado: "esgotado", "Últimas peças": "ultimas-pecas" };

// Configurações da vitrine que já estão no ar hoje (app/loja/page.tsx + Storefront.tsx)
// mais os dados de contato/endereço do painel. A barra de anúncio nasce desligada porque
// a loja aprovada não tem esse elemento visual.
const STORE_SETTINGS_SEED = {
  eyebrow: "Xavier Store · Curadoria masculina",
  title: "Vista sua presença.",
  description:
    "Peças escolhidas para quem entende que estilo não precisa falar alto para ser percebido.",
  hero_image: "/images/store/xavier-category-clothing.webp",
  announcement_enabled: false,
  announcement: "Novidades selecionadas toda semana",
  whatsapp: "+55 (83) 8893-3979",
  instagram: "@xaviercollection",
  address: "Rua Sólon de Lucena, 26 — Centro de Arara",
  opening_hours: "Segunda a sábado, das 08h às 18h",
  seo_title: "Loja | Xavier Collection",
  seo_description:
    "Explore a seleção de moda masculina, acessórios e lifestyle da Xavier Collection.",
};

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const qOrNull = (value, cast) => (value == null ? `null::${cast}` : `${q(value)}::${cast}`);
const num = (value, cast) => (value == null ? `null::${cast}` : `${Number(value).toFixed(2)}::${cast}`);

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const categories = STORE_CATEGORIES.filter((name) => name !== "Todos");
const categorySlugs = new Map(categories.map((name) => [name, slugify(name)]));

for (const product of STORE_PRODUCTS) {
  if (!categorySlugs.has(product.category)) {
    throw new Error(`Produto ${product.id} usa categoria desconhecida: ${product.category}`);
  }
}

const categoryRows = categories.map(
  (name, index) => `  (${q(name)}, ${q(categorySlugs.get(name))}, ${index})`,
);

const productRows = STORE_PRODUCTS.map((product, index) => {
  const soldOut = product.badge === "Esgotado";
  const stock = soldOut ? 0 : ((index * 7 + 5) % 24) + 1;
  const isFeatured = (product.featured ?? 99) <= 6;
  const colors = JSON.stringify(product.colors);
  const sizes = `array[${product.sizes.map(q).join(", ")}]::text[]`;

  return `  (${[
    q(product.id),
    q(product.brand),
    q(product.name),
    q(product.description),
    q(categorySlugs.get(product.category)),
    num(product.price, "numeric"),
    num(product.originalPrice, "numeric"),
    q(product.image),
    qOrNull(product.imagePosition, "text"),
    q(product.imageFit ?? "cover"),
    `${q(colors)}::jsonb`,
    sizes,
    qOrNull(product.badge ? BADGE_TO_DB[product.badge] : null, "text"),
    q(soldOut ? "out-of-stock" : "active"),
    `${stock}::integer`,
    isFeatured ? "true" : "false",
    product.featured == null ? "null::integer" : `${product.featured}::integer`,
    // created_at decrescente: a loja e o painel ordenam por created_at desc (novo no topo),
    // o que reproduz exatamente a ordem do catálogo aprovado.
    `now() - interval '${index} seconds'`,
  ].join(", ")})`;
});

const settings = STORE_SETTINGS_SEED;
const settingsColumns = Object.keys(settings);
const settingsValues = settingsColumns.map((key) =>
  typeof settings[key] === "boolean" ? String(settings[key]) : q(settings[key]),
);

const sql = `-- Xavier Collection — catálogo inicial (GERADO por scripts/generate-seed-migration.mjs
-- a partir de lib/storeCatalog.ts; não edite à mão — regenere com \`npm run db:seed:generate\`).
--
-- Idempotente: reexecutar não sobrescreve nada do que o lojista editou no painel.
-- Os valores de estoque abaixo são ilustrativos (herdados do protótipo): ajuste no painel.

insert into public.categories (name, slug, sort_order)
values
${categoryRows.join(",\n")}
on conflict (slug) do nothing;

insert into public.products (
  slug, brand, name, description, category_id,
  price, original_price,
  image_url, image_position, image_fit,
  colors, sizes, badge, status,
  stock, is_featured, featured_rank, created_at
)
select
  v.slug, v.brand, v.name, v.description, c.id,
  v.price, v.original_price,
  v.image_url, v.image_position, v.image_fit,
  v.colors, v.sizes, v.badge, v.status,
  v.stock, v.is_featured, v.featured_rank, v.created_at
from (
  values
${productRows.join(",\n")}
) as v (
  slug, brand, name, description, category_slug,
  price, original_price,
  image_url, image_position, image_fit,
  colors, sizes, badge, status,
  stock, is_featured, featured_rank, created_at
)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

insert into public.store_settings (id, ${settingsColumns.join(", ")})
values (true, ${settingsValues.join(", ")})
on conflict (id) do nothing;
`;

writeFileSync(OUTPUT, sql, "utf8");
console.log(
  `Seed gerada: ${categories.length} categorias, ${STORE_PRODUCTS.length} produtos -> ${path.relative(process.cwd(), OUTPUT)}`,
);
