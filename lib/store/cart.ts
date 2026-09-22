// Lógica pura da sacola (carrinho). Sem imports em runtime além de tipos — testável no Node,
// como os demais módulos de lib/store/. Este arquivo só calcula; a persistência (localStorage)
// fica no CartProvider (client component), e o texto do pedido continua em lib/store/whatsapp.ts.
//
// Identidade do item: productId + tamanho + cor (não apenas o id do produto) — duas variações
// do mesmo produto são itens diferentes da sacola. Volume não entra na chave: pertence ao
// produto, não é escolha do cliente.

import type { StoreProduct } from "@/lib/storeCatalog";

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

/** Mais de um tamanho real OU mais de uma cor cadastrada exige escolha do cliente. */
export function productRequiresVariant(product: Pick<StoreProduct, "sizes" | "colors">): boolean {
  return product.sizes.length > 1 || product.colors.length > 1;
}

/**
 * Variação implícita quando não há escolha a fazer: o único tamanho cadastrado (se não for o
 * placeholder "Único") e a única cor cadastrada, quando existirem.
 */
export function defaultVariant(product: Pick<StoreProduct, "sizes" | "colors">): CartVariant {
  const [onlySize] = product.sizes;
  const [onlyColor] = product.colors;
  return {
    size: product.sizes.length === 1 && onlySize !== "Único" ? onlySize : undefined,
    color: product.colors.length === 1 ? onlyColor.name : undefined,
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
    price: product.price,
    originalPrice: product.originalPrice,
    quantity,
    stock: product.stock ?? Number.MAX_SAFE_INTEGER,
    volumeMl: product.volumeMl,
    size: variant.size,
    color: variant.color,
  };
}
