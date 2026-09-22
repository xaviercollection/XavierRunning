import type { StoreBadge, StoreProduct } from "@/lib/storeCatalog";
import type { ProductType } from "./productType";

export type ProductStatus = "active" | "draft" | "out-of-stock";

export type AdminProduct = StoreProduct & {
  stock: number;
  status: ProductStatus;
  isFeatured: boolean;
};

export type AdminCategory = { id: string; name: string; visible: boolean; productType: ProductType };

export type StoreSettings = {
  eyebrow: string;
  title: string;
  description: string;
  heroImage: string;
  announcementEnabled: boolean;
  announcement: string;
  whatsapp: string;
  instagram: string;
  address: string;
  openingHours: string;
  seoTitle: string;
  seoDescription: string;
};

/** Payload enviado pelo editor de produto do painel (validado de novo no servidor). */
export type ProductInput = {
  /** Ausente = criar produto. */
  id?: string;
  brand: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  imagePosition?: string | null;
  imageFit?: "cover" | "contain";
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  badge?: StoreBadge | null;
  status: ProductStatus;
  stock: number;
  isFeatured: boolean;
  /** ml (ex.: perfumes). Definido pelo admin; o cliente nunca escolhe. Ausente/null = não se aplica. */
  volumeMl?: number | null;
};

export type FeaturedState = { id: string; isFeatured: boolean; featured: number | null };

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };
