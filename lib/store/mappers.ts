// Linhas do banco -> tipos que a UI já usa (StoreProduct / AdminProduct / StoreSettings).
// Sem imports em runtime (só tipos) para poder ser testado direto no Node.

import type { StoreBadge, StoreProduct } from "@/lib/storeCatalog";
import type { AdminCategory, AdminProduct, ProductStatus, StoreSettings } from "./types";

export const FALLBACK_IMAGE = "/images/store/xavier-category-clothing.webp";

export const BADGE_FROM_DB: Record<string, StoreBadge> = {
  novo: "Novo",
  esgotado: "Esgotado",
  "ultimas-pecas": "Últimas peças",
};

export interface ProductRow {
  id: string;
  slug: string;
  brand: string;
  name: string;
  description: string;
  category_id: string;
  price: number | string;
  original_price: number | string | null;
  image_url: string;
  image_position: string | null;
  image_fit: string;
  colors: unknown;
  sizes: string[] | null;
  badge: string | null;
  status: string;
  is_featured: boolean;
  featured_rank: number | null;
  stock: number | null;
  volume_ml: number | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
}

export interface StoreSettingsRow {
  eyebrow: string;
  title: string;
  description: string;
  hero_image: string;
  announcement_enabled: boolean;
  announcement: string;
  whatsapp: string;
  instagram: string;
  address: string;
  opening_hours: string;
  seo_title: string;
  seo_description: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  eyebrow: "Xavier Store · Curadoria masculina",
  title: "Vista sua presença.",
  description:
    "Peças escolhidas para quem entende que estilo não precisa falar alto para ser percebido.",
  heroImage: FALLBACK_IMAGE,
  announcementEnabled: false,
  announcement: "",
  whatsapp: "",
  instagram: "",
  address: "",
  openingHours: "",
  seoTitle: "Loja | Xavier Collection",
  seoDescription:
    "Explore a seleção de moda masculina, acessórios e lifestyle da Xavier Collection.",
};

/**
 * Nunca devolve um src que o next/image não consiga renderizar: um host desconhecido lança erro
 * em render e derrubaria a página inteira por causa de UMA linha ruim.
 */
export function safeImageSrc(src: string | null | undefined, storagePrefix: string): string {
  if (!src) return FALLBACK_IMAGE;
  if (/[?#\\]/.test(src) || src.includes("..")) return FALLBACK_IMAGE;
  if (src.startsWith("/")) return src.startsWith("/images/") ? src : FALLBACK_IMAGE;
  // Prefixo vazio = nenhum host remoto autorizado (startsWith("") aceitaria qualquer URL).
  return storagePrefix.length > 0 && src.startsWith(storagePrefix) ? src : FALLBACK_IMAGE;
}

function parseColors(value: unknown): Array<{ name: string; hex: string }> {
  if (!Array.isArray(value)) return [];
  const colors: Array<{ name: string; hex: string }> = [];
  for (const entry of value) {
    if (entry && typeof entry === "object") {
      const { name, hex } = entry as Record<string, unknown>;
      if (typeof name === "string" && typeof hex === "string") colors.push({ name, hex });
    }
  }
  return colors;
}

function baseProduct(row: ProductRow, category: string, storagePrefix: string): StoreProduct {
  const originalPrice = row.original_price == null ? undefined : Number(row.original_price);
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    category,
    price: Number(row.price),
    originalPrice,
    image: safeImageSrc(row.image_url, storagePrefix),
    imagePosition: row.image_position ?? undefined,
    imageFit: row.image_fit === "contain" ? "contain" : undefined,
    colors: parseColors(row.colors),
    sizes: row.sizes && row.sizes.length > 0 ? row.sizes : ["Único"],
    badge: row.badge ? BADGE_FROM_DB[row.badge] : undefined,
    featured: row.featured_rank ?? undefined,
    description: row.description,
    volumeMl: row.volume_ml == null ? undefined : Number(row.volume_ml),
    stock: row.stock ?? 0,
  };
}

/** Produto como o cliente vê: status "out-of-stock" aparece como selo "Esgotado". */
export function toStoreProduct(row: ProductRow, category: string, storagePrefix: string): StoreProduct {
  const product = baseProduct(row, category, storagePrefix);
  if (row.status === "out-of-stock") product.badge = "Esgotado";
  return product;
}

/** Produto como o lojista edita: valores exatamente como gravados. */
export function toAdminProduct(row: ProductRow, category: string, storagePrefix: string): AdminProduct {
  return {
    ...baseProduct(row, category, storagePrefix),
    stock: row.stock ?? 0,
    status: row.status as ProductStatus,
    isFeatured: row.is_featured,
  };
}

export function toAdminCategory(row: CategoryRow): AdminCategory {
  return { id: row.id, name: row.name, visible: row.is_visible };
}

export function toStoreSettings(row: StoreSettingsRow | null | undefined): StoreSettings {
  if (!row) return { ...DEFAULT_STORE_SETTINGS };
  return {
    eyebrow: row.eyebrow,
    title: row.title,
    description: row.description,
    heroImage: row.hero_image,
    announcementEnabled: row.announcement_enabled,
    announcement: row.announcement,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    address: row.address,
    openingHours: row.opening_hours,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}
