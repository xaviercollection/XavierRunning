export const STORE_CATEGORIES = [
  "Todos",
  "Perfumes",
  "Camisas",
  "Casacos",
  "Chapéus e bonés",
  "Óculos",
  "Sapatos",
  "Calças",
  "Shorts",
  "Roupas de academia",
] as const;

export type StoreCategory = Exclude<(typeof STORE_CATEGORIES)[number], "Todos">;
export type StoreBadge = "Novo" | "Esgotado" | "Últimas peças";

export interface StoreProduct {
  id: string;
  brand: string;
  name: string;
  category: StoreCategory;
  price: number;
  originalPrice?: number;
  image: string;
  imagePosition?: string;
  imageFit?: "cover" | "contain";
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  badge?: StoreBadge;
  featured?: number;
  description: string;
}

const IMAGES = {
  crosby1: "/images/roupas/crosby/Captura de tela 2026-09-17 145623.webp",
  crosby2: "/images/roupas/crosby/Captura de tela 2026-09-17 145643.webp",
  crosby3: "/images/roupas/crosby/Captura de tela 2026-09-17 145714.webp",
  strike1: "/images/roupas/strike/images.webp",
  strike2:
    "/images/roupas/strike/313022291826e187197a5f88409b551d-39e2b5a0bd5556bd1217605398354924-480-0.webp",
  strike3:
    "/images/roupas/strike/img_1997-d7756523ab99df0d9217875776080463-480-0.webp",
  zara1: "/images/roupas/zara/Captura de tela 2026-09-17 144308.webp",
  zara2: "/images/roupas/zara/Captura de tela 2026-09-17 144357.webp",
  zara3: "/images/roupas/zara/Captura de tela 2026-09-17 144423.webp",
  zara4: "/images/roupas/zara/Captura de tela 2026-09-17 144512.webp",
  accessories: "/images/store/xavier-category-accessories.webp",
  clothing: "/images/store/xavier-category-clothing.webp",
  store: "/images/store/xavier-store-showcase.webp",
  asad: "/images/perfumes/asad-lattafa.webp",
  ckBe: "/images/perfumes/ck-be.webp",
  vipBlack: "/images/perfumes/212-vip-black.webp",
} as const;

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: "zara-camisa-signature",
    brand: "Zara",
    name: "Camisa Signature",
    category: "Camisas",
    price: 239.9,
    image: IMAGES.zara1,
    colors: [
      { name: "Preto", hex: "#171717" },
      { name: "Areia", hex: "#c7b89a" },
    ],
    sizes: ["P", "M", "G", "GG"],
    badge: "Novo",
    featured: 1,
    description: "Corte limpo, toque macio e presença sem excesso.",
  },
  {
    id: "strike-camisa-urban",
    brand: "Strike",
    name: "Camisa Urban",
    category: "Camisas",
    price: 189.9,
    originalPrice: 229.9,
    image: IMAGES.strike1,
    colors: [
      { name: "Off-white", hex: "#e8e4da" },
      { name: "Preto", hex: "#161616" },
    ],
    sizes: ["P", "M", "G"],
    featured: 5,
    description: "Modelagem urbana com estampa autoral.",
  },
  {
    id: "crosby-casaco-heritage",
    brand: "Crosby",
    name: "Casaco Heritage",
    category: "Casacos",
    price: 529.9,
    image: IMAGES.crosby2,
    colors: [
      { name: "Grafite", hex: "#343434" },
      { name: "Marrom", hex: "#563d31" },
    ],
    sizes: ["M", "G", "GG"],
    badge: "Últimas peças",
    featured: 2,
    description: "Estrutura contemporânea para dias mais frios.",
  },
  {
    id: "zara-casaco-noir",
    brand: "Zara",
    name: "Casaco Noir",
    category: "Casacos",
    price: 619.9,
    image: IMAGES.zara3,
    colors: [{ name: "Preto", hex: "#111111" }],
    sizes: ["P", "M", "G"],
    featured: 7,
    description: "Silhueta precisa, construída para atravessar temporadas.",
  },
  {
    id: "xavier-bone-club",
    brand: "Xavier",
    name: "Boné Club",
    category: "Chapéus e bonés",
    price: 119.9,
    image: IMAGES.accessories,
    imagePosition: "30% 82%",
    colors: [
      { name: "Preto", hex: "#151515" },
      { name: "Azul", hex: "#233a63" },
    ],
    sizes: ["Único"],
    badge: "Novo",
    featured: 3,
    description: "Ajuste confortável e acabamento minimalista.",
  },
  {
    id: "crosby-bone-essential",
    brand: "Crosby",
    name: "Boné Essential",
    category: "Chapéus e bonés",
    price: 139.9,
    originalPrice: 169.9,
    image: IMAGES.clothing,
    imagePosition: "22% 80%",
    colors: [
      { name: "Verde", hex: "#304834" },
      { name: "Areia", hex: "#b6a98d" },
    ],
    sizes: ["Único"],
    featured: 12,
    description: "Um essencial com assinatura discreta.",
  },
  {
    id: "xavier-oculos-onyx",
    brand: "Xavier",
    name: "Óculos Onyx",
    category: "Óculos",
    price: 279.9,
    image: IMAGES.accessories,
    imagePosition: "22% 43%",
    colors: [
      { name: "Preto", hex: "#111111" },
      { name: "Fumê", hex: "#625d58" },
    ],
    sizes: ["Único"],
    badge: "Novo",
    featured: 4,
    description: "Linhas marcantes e lentes com proteção UV.",
  },
  {
    id: "strike-oculos-prism",
    brand: "Strike",
    name: "Óculos Prism",
    category: "Óculos",
    price: 249.9,
    image: IMAGES.accessories,
    imagePosition: "48% 48%",
    colors: [
      { name: "Azul", hex: "#245a80" },
      { name: "Roxo", hex: "#60417b" },
    ],
    sizes: ["Único"],
    badge: "Esgotado",
    featured: 14,
    description: "Performance visual com atitude de rua.",
  },
  {
    id: "lattafa-asad",
    brand: "Lattafa",
    name: "Asad",
    category: "Perfumes",
    price: 249.9,
    image: IMAGES.asad,
    imageFit: "contain",
    colors: [
      { name: "Preto", hex: "#111111" },
      { name: "Dourado", hex: "#b8944e" },
    ],
    sizes: ["100 ml"],
    badge: "Novo",
    featured: 2,
    description: "Fragrância árabe intensa, especiada e marcante.",
  },
  {
    id: "calvin-klein-be",
    brand: "Calvin Klein",
    name: "CK Be",
    category: "Perfumes",
    price: 229.9,
    originalPrice: 279.9,
    image: IMAGES.ckBe,
    imageFit: "contain",
    colors: [{ name: "Preto", hex: "#111111" }],
    sizes: ["100 ml", "200 ml"],
    featured: 8,
    description: "Uma assinatura limpa, fresca e confortável para todos os dias.",
  },
  {
    id: "carolina-herrera-212-vip-black",
    brand: "Carolina Herrera",
    name: "212 VIP Black",
    category: "Perfumes",
    price: 399.9,
    image: IMAGES.vipBlack,
    imageFit: "contain",
    colors: [
      { name: "Preto", hex: "#101010" },
      { name: "Prata", hex: "#a9a9a9" },
    ],
    sizes: ["100 ml"],
    badge: "Últimas peças",
    featured: 6,
    description: "Aromático, sedutor e construído para a noite.",
  },
  {
    id: "zara-sapato-monaco",
    brand: "Zara",
    name: "Sapato Monaco",
    category: "Sapatos",
    price: 459.9,
    image: IMAGES.zara4,
    imagePosition: "50% 62%",
    colors: [
      { name: "Preto", hex: "#101010" },
      { name: "Café", hex: "#4c3022" },
    ],
    sizes: ["39", "40", "41", "42", "43"],
    featured: 8,
    description: "Construção elegante para ocasiões que pedem presença.",
  },
  {
    id: "strike-tenis-axis",
    brand: "Strike",
    name: "Tênis Axis",
    category: "Sapatos",
    price: 349.9,
    image: IMAGES.strike3,
    imagePosition: "50% 60%",
    colors: [
      { name: "Branco", hex: "#e7e7e2" },
      { name: "Preto", hex: "#141414" },
    ],
    sizes: ["38", "39", "40", "41", "42"],
    badge: "Últimas peças",
    featured: 10,
    description: "Conforto diário com construção esportiva.",
  },
  {
    id: "crosby-calca-tailored",
    brand: "Crosby",
    name: "Calça Tailored",
    category: "Calças",
    price: 329.9,
    image: IMAGES.crosby1,
    imagePosition: "50% 58%",
    colors: [
      { name: "Preto", hex: "#141414" },
      { name: "Cinza", hex: "#575757" },
    ],
    sizes: ["38", "40", "42", "44"],
    featured: 6,
    description: "Caimento alinhado com liberdade de movimento.",
  },
  {
    id: "zara-calca-relaxed",
    brand: "Zara",
    name: "Calça Relaxed",
    category: "Calças",
    price: 289.9,
    originalPrice: 349.9,
    image: IMAGES.zara2,
    imagePosition: "50% 58%",
    colors: [
      { name: "Areia", hex: "#b3a88e" },
      { name: "Verde", hex: "#394a3b" },
    ],
    sizes: ["38", "40", "42", "44", "46"],
    featured: 11,
    description: "Volume contemporâneo e tecido de toque encorpado.",
  },
  {
    id: "strike-short-motion",
    brand: "Strike",
    name: "Short Motion",
    category: "Shorts",
    price: 169.9,
    image: IMAGES.strike2,
    imagePosition: "50% 58%",
    colors: [
      { name: "Preto", hex: "#111111" },
      { name: "Verde", hex: "#314638" },
    ],
    sizes: ["P", "M", "G", "GG"],
    badge: "Novo",
    featured: 9,
    description: "Leveza e mobilidade para o ritmo da cidade.",
  },
  {
    id: "xavier-short-resort",
    brand: "Xavier",
    name: "Short Resort",
    category: "Shorts",
    price: 199.9,
    originalPrice: 239.9,
    image: IMAGES.clothing,
    imagePosition: "62% 78%",
    colors: [
      { name: "Azul", hex: "#304968" },
      { name: "Off-white", hex: "#e6e0d3" },
    ],
    sizes: ["P", "M", "G"],
    featured: 16,
    description: "Essencial descontraído com acabamento premium.",
  },
  {
    id: "xavier-training-set",
    brand: "Xavier Active",
    name: "Training Set",
    category: "Roupas de academia",
    price: 299.9,
    image: IMAGES.store,
    imagePosition: "20% 72%",
    colors: [
      { name: "Preto", hex: "#121212" },
      { name: "Marinho", hex: "#1c293c" },
    ],
    sizes: ["P", "M", "G", "GG"],
    badge: "Novo",
    featured: 13,
    description: "Conjunto técnico para treinos e deslocamentos.",
  },
  {
    id: "strike-performance-tee",
    brand: "Strike",
    name: "Performance Tee",
    category: "Roupas de academia",
    price: 149.9,
    image: IMAGES.strike3,
    colors: [
      { name: "Preto", hex: "#111111" },
      { name: "Cinza", hex: "#696969" },
    ],
    sizes: ["P", "M", "G"],
    badge: "Esgotado",
    featured: 15,
    description: "Respirabilidade, secagem rápida e corte atlético.",
  },
];

export const STORE_BRANDS = Array.from(
  new Set(STORE_PRODUCTS.map((product) => product.brand)),
).sort();

export const STORE_SIZES = Array.from(
  new Set(STORE_PRODUCTS.flatMap((product) => product.sizes)),
);

export function formatStorePrice(price: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}
