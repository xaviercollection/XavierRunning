// Lista única de colunas usadas nas queries ao Supabase.
//
// Sem imports de propósito: também é carregado por scripts/db-test.mjs, que compara
// estas listas com o schema realmente migrado (pega coluna digitada errada antes de produção).
//
// products.stock ESTÁ em PUBLIC_PRODUCT_COLUMNS (migration 20260922090000): a sacola roda no
// navegador do cliente, sem checkout no servidor, então precisa saber o estoque disponível
// para não deixar a quantidade passar do limite. Continua fora de PUBLIC_PRODUCT_COLUMNS
// qualquer coluna não listada aqui (created_at/updated_at) — por isso um `select *` anônimo
// continua falhando de propósito. Sempre liste colunas explicitamente.

export const PUBLIC_PRODUCT_COLUMNS = [
  "id",
  "slug",
  "brand",
  "name",
  "description",
  "category_id",
  "price",
  "original_price",
  "image_url",
  "image_position",
  "image_fit",
  "colors",
  "sizes",
  "badge",
  "status",
  "is_featured",
  "featured_rank",
  "volume_ml",
  "stock",
] as const;

export const ADMIN_PRODUCT_COLUMNS = PUBLIC_PRODUCT_COLUMNS;

export const CATEGORY_COLUMNS = ["id", "name", "slug", "sort_order", "is_visible"] as const;

export const STORE_SETTINGS_COLUMNS = [
  "eyebrow",
  "title",
  "description",
  "hero_image",
  "announcement_enabled",
  "announcement",
  "whatsapp",
  "instagram",
  "address",
  "opening_hours",
  "seo_title",
  "seo_description",
] as const;

export const PRODUCT_STATUSES = ["active", "draft", "out-of-stock"] as const;
export const PRODUCT_BADGES_DB = ["novo", "esgotado", "ultimas-pecas"] as const;
export const IMAGE_FITS = ["cover", "contain"] as const;
export const PRODUCT_IMAGES_BUCKET = "product-images";
