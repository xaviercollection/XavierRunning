export interface ClothingItem {
    slug: string;
    brand: string;
    name: string;
    nameLines: string[];
    tagline?: string;
    price?: string;
    cta?: string;
    imageSrc: string;
    focalPoint?: { x: number; y: number };
}

export const carouselClothing: ClothingItem[] = [
    // Crosby
    {
        slug: "crosby-1",
        brand: "Crosby",
        name: "Crosby Essential",
        nameLines: ["Crosby", "Essential"],
        tagline: "Alfaiataria que dita o tom.",
        price: "R$ 499,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/crosby/Captura de tela 2026-09-17 145623.png",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    {
        slug: "crosby-2",
        brand: "Crosby",
        name: "Crosby Premium",
        nameLines: ["Crosby", "Premium"],
        tagline: "Presença sem excessos.",
        price: "R$ 529,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/crosby/Captura de tela 2026-09-17 145643.png",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    {
        slug: "crosby-3",
        brand: "Crosby",
        name: "Crosby Signature",
        nameLines: ["Crosby", "Signature"],
        tagline: "O estilo que te define.",
        price: "R$ 479,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/crosby/Captura de tela 2026-09-17 145714.png",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    // Strike
    {
        slug: "strike-1",
        brand: "Strike",
        name: "Strike Classic",
        nameLines: ["Strike", "Classic"],
        tagline: "Estampa autoral, presença de rua.",
        price: "R$ 189,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/strike/images.jpeg",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    {
        slug: "strike-2",
        brand: "Strike",
        name: "Strike Urban",
        nameLines: ["Strike", "Urban"],
        tagline: "Atitude em cada detalhe.",
        price: "R$ 209,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/strike/313022291826e187197a5f88409b551d-39e2b5a0bd5556bd1217605398354924-480-0.webp",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    {
        slug: "strike-3",
        brand: "Strike",
        name: "Strike Street",
        nameLines: ["Strike", "Street"],
        tagline: "Born on the streets.",
        price: "R$ 199,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/strike/img_1997-d7756523ab99df0d9217875776080463-480-0.webp",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    // Zara
    {
        slug: "zara-1",
        brand: "Zara",
        name: "Zara Essentials",
        nameLines: ["Zara", "Essentials"],
        tagline: "Moda contemporânea.",
        price: "R$ 299,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/zara/Captura de tela 2026-09-17 144308.png",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    {
        slug: "zara-2",
        brand: "Zara",
        name: "Zara Modern",
        nameLines: ["Zara", "Modern"],
        tagline: "Estilo inconfundível.",
        price: "R$ 319,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/zara/Captura de tela 2026-09-17 144357.png",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    {
        slug: "zara-3",
        brand: "Zara",
        name: "Zara Collection",
        nameLines: ["Zara", "Collection"],
        tagline: "Elegância do dia a dia.",
        price: "R$ 279,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/zara/Captura de tela 2026-09-17 144423.png",
        focalPoint: { x: 0.5, y: 0.4 },
    },
    {
        slug: "zara-4",
        brand: "Zara",
        name: "Zara Signature",
        nameLines: ["Zara", "Signature"],
        tagline: "Vista quem você é.",
        price: "R$ 339,90",
        cta: "Ver peça",
        imageSrc: "/images/roupas/zara/Captura de tela 2026-09-17 144512.png",
        focalPoint: { x: 0.5, y: 0.4 },
    },
];
