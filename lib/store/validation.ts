// Validação server-side das entradas do painel. Espelha os CHECKs do banco (que continuam
// sendo a barreira final), mas devolve mensagens legíveis em vez de um SQLSTATE.
// Sem imports em runtime (só tipos) para poder ser testado direto no Node.

import type { StoreBadge } from "@/lib/storeCatalog";
import type { ProductStatus, StoreSettings } from "./types";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = (error: string): Parsed<never> => ({ ok: false, error });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSITION_RE = /^[0-9]{1,3}(\.[0-9]+)?% [0-9]{1,3}(\.[0-9]+)?%$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const PRODUCT_STATUS_VALUES: readonly ProductStatus[] = ["active", "draft", "out-of-stock"];
export const PRODUCT_BADGE_VALUES: readonly StoreBadge[] = ["Novo", "Esgotado", "Últimas peças"];
export const BADGE_TO_DB: Record<StoreBadge, string> = {
  Novo: "novo",
  Esgotado: "esgotado",
  "Últimas peças": "ultimas-pecas",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Imagem aceita: arquivo local em /images/... ou URL pública do bucket product-images. */
export function isAllowedImageSrc(src: string, storagePrefix: string): boolean {
  if (src.length === 0 || src.length > 600) return false;
  if (/[?#\\]/.test(src) || src.includes("..")) return false;
  if (src.startsWith("/")) return src.startsWith("/images/");
  // Prefixo vazio = nenhum host remoto autorizado (startsWith("") aceitaria qualquer URL).
  return storagePrefix.length > 0 && src.startsWith(storagePrefix);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

/** Tentativa 0 = slug puro; depois acrescenta sufixo aleatório curto para resolver colisões. */
export function slugCandidate(base: string, attempt: number): string {
  const root = base || "produto";
  if (attempt === 0) return root;
  return `${root}-${Math.random().toString(36).slice(2, 6)}`;
}

function readText(raw: unknown, label: string, max: number, required: boolean): Parsed<string> {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (required && value.length === 0) return fail(`Informe o campo "${label}".`);
  if (value.length > max) return fail(`O campo "${label}" excede ${max} caracteres.`);
  return ok(value);
}

function readNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface ValidProduct {
  id?: string;
  brand: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  originalPrice: number | null;
  image: string;
  imagePosition: string | null;
  imageFit: "cover" | "contain";
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  badge: StoreBadge | null;
  status: ProductStatus;
  stock: number;
  isFeatured: boolean;
  volumeMl: number | null;
}

export function parseProductInput(raw: unknown, storagePrefix: string): Parsed<ValidProduct> {
  if (!isRecord(raw)) return fail("Dados do produto inválidos.");

  let id: string | undefined;
  if (raw.id !== undefined && raw.id !== null && raw.id !== "") {
    if (!isUuid(raw.id)) return fail("Identificador do produto inválido.");
    id = raw.id;
  }

  const brand = readText(raw.brand, "Marca", 80, true);
  if (!brand.ok) return brand;
  const name = readText(raw.name, "Nome do produto", 160, true);
  if (!name.ok) return name;
  const description = readText(raw.description, "Descrição", 1200, false);
  if (!description.ok) return description;

  if (!isUuid(raw.categoryId)) return fail("Selecione uma categoria válida.");

  const priceValue = readNumber(raw.price);
  if (priceValue === null || priceValue < 0 || priceValue >= 1_000_000) {
    return fail("Informe um preço de venda válido.");
  }
  const price = round2(priceValue);

  let originalPrice: number | null = null;
  if (raw.originalPrice !== undefined && raw.originalPrice !== null && raw.originalPrice !== "") {
    const original = readNumber(raw.originalPrice);
    if (original === null || round2(original) <= price) {
      return fail("O preço anterior precisa ser maior que o preço de venda.");
    }
    originalPrice = round2(original);
  }

  const image = typeof raw.image === "string" ? raw.image.trim() : "";
  if (!isAllowedImageSrc(image, storagePrefix)) {
    return fail("Imagem inválida. Envie um arquivo pelo painel ou use um caminho /images/...");
  }

  let imagePosition: string | null = null;
  if (typeof raw.imagePosition === "string" && raw.imagePosition.trim() !== "") {
    if (!POSITION_RE.test(raw.imagePosition.trim())) return fail("Posição da imagem inválida.");
    imagePosition = raw.imagePosition.trim();
  }

  const imageFit = raw.imageFit === "contain" ? "contain" : "cover";

  const colors: Array<{ name: string; hex: string }> = [];
  if (Array.isArray(raw.colors)) {
    for (const entry of raw.colors.slice(0, 12)) {
      if (!isRecord(entry)) continue;
      const colorName = typeof entry.name === "string" ? entry.name.trim() : "";
      const hex = typeof entry.hex === "string" ? entry.hex.trim() : "";
      if (colorName.length >= 1 && colorName.length <= 40 && HEX_RE.test(hex)) {
        colors.push({ name: colorName, hex });
      }
    }
  }

  const sizes: string[] = [];
  if (Array.isArray(raw.sizes)) {
    for (const entry of raw.sizes) {
      const size = typeof entry === "string" ? entry.trim() : "";
      if (size.length === 0) continue;
      if (size.length > 20) return fail("Cada tamanho/volume pode ter no máximo 20 caracteres.");
      if (!sizes.includes(size)) sizes.push(size);
    }
  }
  if (sizes.length > 20) return fail("Informe no máximo 20 tamanhos/volumes.");
  if (sizes.length === 0) sizes.push("Único");

  let badge: StoreBadge | null = null;
  if (raw.badge !== undefined && raw.badge !== null && raw.badge !== "") {
    if (!PRODUCT_BADGE_VALUES.includes(raw.badge as StoreBadge)) return fail("Selo inválido.");
    badge = raw.badge as StoreBadge;
  }

  if (!PRODUCT_STATUS_VALUES.includes(raw.status as ProductStatus)) return fail("Status inválido.");
  const status = raw.status as ProductStatus;

  const stockValue = readNumber(raw.stock);
  if (stockValue === null || stockValue < 0 || stockValue > 1_000_000) {
    return fail("Informe um estoque válido (0 ou mais).");
  }

  let volumeMl: number | null = null;
  if (raw.volumeMl !== undefined && raw.volumeMl !== null && raw.volumeMl !== "") {
    const volume = readNumber(raw.volumeMl);
    if (volume === null || volume <= 0 || volume > 100_000) {
      return fail("Informe um volume em ml válido (número inteiro positivo).");
    }
    volumeMl = Math.round(volume);
  }

  return ok({
    id,
    brand: brand.value,
    name: name.value,
    description: description.value,
    categoryId: raw.categoryId,
    price,
    originalPrice,
    image,
    imagePosition,
    imageFit,
    colors,
    sizes,
    badge,
    status,
    stock: Math.floor(stockValue),
    isFeatured: raw.isFeatured === true,
    volumeMl,
  });
}

/** Colunas graváveis de products. Destaque (is_featured/featured_rank) vai por RPC; slug só na criação. */
export function toProductRow(product: ValidProduct) {
  return {
    brand: product.brand,
    name: product.name,
    description: product.description,
    category_id: product.categoryId,
    price: product.price,
    original_price: product.originalPrice,
    image_url: product.image,
    image_position: product.imagePosition,
    image_fit: product.imageFit,
    colors: product.colors,
    sizes: product.sizes,
    badge: product.badge ? BADGE_TO_DB[product.badge] : null,
    status: product.status,
    stock: product.stock,
    volume_ml: product.volumeMl,
  };
}

export function parseStoreSettingsInput(raw: unknown, storagePrefix: string): Parsed<StoreSettings> {
  if (!isRecord(raw)) return fail("Dados da vitrine inválidos.");

  const eyebrow = readText(raw.eyebrow, "Chamada superior", 120, false);
  if (!eyebrow.ok) return eyebrow;
  const title = readText(raw.title, "Título", 160, true);
  if (!title.ok) return title;
  const description = readText(raw.description, "Descrição", 600, false);
  if (!description.ok) return description;
  const announcement = readText(raw.announcement, "Texto do aviso", 200, false);
  if (!announcement.ok) return announcement;
  const whatsapp = readText(raw.whatsapp, "WhatsApp", 40, false);
  if (!whatsapp.ok) return whatsapp;
  const instagram = readText(raw.instagram, "Instagram", 80, false);
  if (!instagram.ok) return instagram;
  const address = readText(raw.address, "Endereço", 240, false);
  if (!address.ok) return address;
  const openingHours = readText(raw.openingHours, "Horário de funcionamento", 160, false);
  if (!openingHours.ok) return openingHours;
  const seoTitle = readText(raw.seoTitle, "Título da página", 120, false);
  if (!seoTitle.ok) return seoTitle;
  const seoDescription = readText(raw.seoDescription, "Descrição da página", 320, false);
  if (!seoDescription.ok) return seoDescription;

  if (whatsapp.value !== "") {
    const digits = whatsapp.value.replace(/\D/g, "").length;
    if (digits < 10 || digits > 15) return fail("WhatsApp inválido. Informe DDD e número.");
  }

  const heroImage = typeof raw.heroImage === "string" ? raw.heroImage.trim() : "";
  if (!isAllowedImageSrc(heroImage, storagePrefix)) {
    return fail("Imagem do hero inválida. Use um caminho /images/... ou uma imagem enviada pelo painel.");
  }

  return ok({
    eyebrow: eyebrow.value,
    title: title.value,
    description: description.value,
    heroImage,
    announcementEnabled: raw.announcementEnabled === true,
    announcement: announcement.value,
    whatsapp: whatsapp.value,
    instagram: instagram.value,
    address: address.value,
    openingHours: openingHours.value,
    seoTitle: seoTitle.value,
    seoDescription: seoDescription.value,
  });
}

export function toStoreSettingsRow(settings: StoreSettings) {
  return {
    eyebrow: settings.eyebrow,
    title: settings.title,
    description: settings.description,
    hero_image: settings.heroImage,
    announcement_enabled: settings.announcementEnabled,
    announcement: settings.announcement,
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    address: settings.address,
    opening_hours: settings.openingHours,
    seo_title: settings.seoTitle,
    seo_description: settings.seoDescription,
  };
}
