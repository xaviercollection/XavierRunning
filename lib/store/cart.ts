// Lógica pura da sacola (carrinho). Sem imports em runtime além de tipos — testável no Node,
// como os demais módulos de lib/store/. Este arquivo só calcula; a persistência (localStorage)
// fica no CartProvider (client component), e o texto do pedido continua em lib/store/whatsapp.ts.
//
// Identidade do item: productId + tamanho + cor (não apenas o id do produto) — duas variações
// do mesmo produto são itens diferentes da sacola. Volume não entra na chave: pertence ao
// produto, não é escolha do cliente.

import type { StoreProduct } from "@/lib/storeCatalog";
import { attributesForType, type ProductType } from "./productType.ts";

export interface CartVariant {
  size?: string;
  color?: string;
}

export interface CartItem {
  key: string;
  productId: string;
  slug?: string;
  name: string;
  brand: string;
  image: string;
  imagePosition?: string;
  imageFit?: "cover" | "contain";
  category: string;
  /** Tipo da categoria no momento da adição — decide o rótulo de `size` (Tamanho/Numeração). */
  productType?: ProductType;
  price: number;
  originalPrice?: number;
  quantity: number;
  /** Estoque disponível no momento em que o item entrou/foi atualizado na sacola. */
  stock: number;
  volumeMl?: number;
  size?: string;
  color?: string;
}

export function cartItemKey(productId: string, variant: CartVariant): string {
  return `${productId}::${variant.size ?? ""}::${variant.color ?? ""}`;
}

type VariantProduct = Pick<StoreProduct, "sizes" | "colors" | "productType">;

/**
 * Só considera `sizes`/`colors` relevantes quando o TIPO do produto os usa — um perfume com
 * "100ml" preso em `sizes` (dado legado) não conta como tamanho, porque perfume não usa esse
 * campo (ver lib/store/productType.ts). Mais de um valor relevante exige escolha do cliente.
 */
export function productRequiresVariant(product: VariantProduct): boolean {
  const attrs = attributesForType(product.productType);
  const sizeCount = attrs.sizes ? product.sizes.length : 0;
  const colorCount = attrs.colors ? product.colors.length : 0;
  return sizeCount > 1 || colorCount > 1;
}

/**
 * Variação implícita quando não há escolha a fazer: o único tamanho cadastrado (se não for o
 * placeholder "Único") e a única cor cadastrada, quando existirem e o tipo do produto os usa.
 */
export function defaultVariant(product: VariantProduct): CartVariant {
  const attrs = attributesForType(product.productType);
  const sizes = attrs.sizes ? product.sizes : [];
  const colors = attrs.colors ? product.colors : [];
  const [onlySize] = sizes;
  const [onlyColor] = colors;
  return {
    size: sizes.length === 1 && onlySize !== "Único" ? onlySize : undefined,
    color: colors.length === 1 ? onlyColor.name : undefined,
  };
}

/** Esgotado pelo selo do painel OU pelo estoque cadastrado — o que vier primeiro. */
export function isProductSoldOut(product: Pick<StoreProduct, "badge" | "stock">): boolean {
  return product.badge === "Esgotado" || (product.stock !== undefined && product.stock <= 0);
}

/** Nunca deixa a quantidade sair de 1..estoque; estoque zerado devolve 0 (o item deve sair da sacola). */
export function clampQuantity(quantity: number, stock: number): number {
  const safeStock = Math.max(0, Math.floor(stock));
  if (safeStock <= 0) return 0;
  return Math.min(Math.max(1, Math.floor(quantity)), safeStock);
}

// Preço em centavos evita erro de ponto flutuante (0.1 + 0.2 !== 0.3) ao somar a sacola.
const toCents = (price: number) => Math.round(price * 100);

export function cartItemSubtotalCents(item: Pick<CartItem, "price" | "quantity">): number {
  return toCents(item.price) * item.quantity;
}

export function cartTotalCents(items: Array<Pick<CartItem, "price" | "quantity">>): number {
  return items.reduce((total, item) => total + cartItemSubtotalCents(item), 0);
}

export function cartCount(items: Array<Pick<CartItem, "quantity">>): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartItemFromProduct(product: StoreProduct, variant: CartVariant, quantity: number): CartItem {
  const attrs = attributesForType(product.productType);
  return {
    key: cartItemKey(product.id, variant),
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: product.image,
    imagePosition: product.imagePosition,
    imageFit: product.imageFit,
    category: product.category,
    productType: product.productType,
    price: product.price,
    originalPrice: product.originalPrice,
    quantity,
    stock: product.stock ?? Number.MAX_SAFE_INTEGER,
    // O tipo é a autoridade: dado legado num campo que o tipo não usa (ex.: "100ml" em sizes
    // de um perfume) nunca chega à sacola, mesmo que ainda exista na linha do banco.
    volumeMl: attrs.volume ? product.volumeMl : undefined,
    size: variant.size,
    color: variant.color,
  };
}
