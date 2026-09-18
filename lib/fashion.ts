export interface FashionPiece {
  slug: string;
  brand?: string;
  category: string;
  name: string;
  description: string;
  price: string;
  imagePath: string;
}

export const fashionPieces: FashionPiece[] = [
  {
    slug: "strike",
    brand: "Strike",
    category: "Streetwear selection",
    name: "STRIKE",
    description: "Estampa autoral, presença de rua.",
    price: "R$ 189,90",
    imagePath: "images/roupas/strike/images",
  },
  {
    slug: "crosby-essential",
    brand: "Crosby",
    category: "Essential wear",
    name: "CROSBY",
    description: "Alfaiataria que dita o tom.",
    price: "R$ 499,90",
    imagePath: "images/roupas/crosby/Captura de tela 2026-09-17 145623",
  },
  {
    slug: "zara-essentials",
    brand: "Zara",
    category: "Contemporary style",
    name: "ZARA",
    description: "Moda contemporânea, estilo inconfundível.",
    price: "R$ 299,90",
    imagePath: "images/roupas/zara/Captura de tela 2026-09-17 144308",
  },
];
