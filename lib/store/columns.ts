// Lista única de colunas usadas nas queries ao Supabase.
//
// Sem imports de propósito: também é carregado por scripts/db-test.mjs, que compara
// estas listas com o schema realmente migrado (pega coluna digitada errada antes de produção).
//
// products.stock NÃO está em PUBLIC_PRODUCT_COLUMNS: o papel anon não tem grant nessa coluna,
// então um `select *` anônimo falha de propósito. Sempre liste colunas explicitamente.

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
] as const;

export const ADMIN_PRODUCT_COLUMNS = [...PUBLIC_PRODUCT_COLUMNS, "stock"] as const;

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
