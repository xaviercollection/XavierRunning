// Fonte única de verdade: quais atributos de variação fazem sentido para cada tipo de produto.
// Sem imports em runtime (só tipos) — testável no Node, como os demais módulos de lib/store/.
//
// O tipo pertence à CATEGORIA (categories.product_type, migration 20260922150000), não ao
// produto: perfume é líquido (volume em ml), roupa tem tamanho de vestuário + cor, calçado tem
// numeração + cor, óculos/relógio têm cor (por ora). Nenhum campo novo de variação foi criado —
// sizes/colors/volume_ml continuam sendo os únicos, isto só decide QUANDO cada um é relevante.

export const PRODUCT_TYPES = [
  "perfume",
  "clothing",
  "footwear",
  "glasses",
  "watch",
  "accessory",
  "generic",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const DEFAULT_PRODUCT_TYPE: ProductType = "generic";

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  perfume: "Perfume",
  clothing: "Roupa",
  footwear: "Calçado",
  glasses: "Óculos",
  watch: "Relógio",
  accessory: "Acessório",
  generic: "Genérico",
};

export interface ProductTypeAttributes {
  /** Perfume: volume em ml, definido pelo admin — o cliente nunca escolhe. */
  volume: boolean;
  /** Tamanho de vestuário (roupa) ou numeração (calçado) — mesmo campo `sizes`, rótulo diferente. */
  sizes: boolean;
  /** Rótulo a exibir para o campo `sizes` quando `sizes` é true. */
  sizeLabel: string;
  /** Cor é uma variação — quando false, o campo nem aparece no admin/loja. */
  colors: boolean;
}

const ATTRIBUTES: Record<ProductType, ProductTypeAttributes> = {
  perfume: { volume: true, sizes: false, sizeLabel: "Tamanhos", colors: false },
  clothing: { volume: false, sizes: true, sizeLabel: "Tamanhos", colors: true },
  footwear: { volume: false, sizes: true, sizeLabel: "Numeração", colors: true },
  glasses: { volume: false, sizes: false, sizeLabel: "Tamanhos", colors: true },
  watch: { volume: false, sizes: false, sizeLabel: "Tamanhos", colors: true },
  // accessory/generic preservam o comportamento anterior (tamanho + cor) para não quebrar
  // categorias ainda não classificadas — ver DEFAULT_PRODUCT_TYPE.
  accessory: { volume: false, sizes: true, sizeLabel: "Tamanhos", colors: true },
  generic: { volume: false, sizes: true, sizeLabel: "Tamanhos", colors: true },
};

export function isProductType(value: unknown): value is ProductType {
  return typeof value === "string" && (PRODUCT_TYPES as readonly string[]).includes(value);
}

/** Nunca lança: valor desconhecido/ausente cai em "generic" (mesmo comportamento de hoje). */
export function attributesForType(type: string | null | undefined): ProductTypeAttributes {
  return ATTRIBUTES[isProductType(type) ? type : DEFAULT_PRODUCT_TYPE];
}
