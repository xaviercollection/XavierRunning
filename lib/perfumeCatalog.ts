import type { PerfumeMedia } from "./media";

export interface CarouselPerfume {
  slug: string;
  brand: string;
  name: string;
  /** Rendered as stacked lines, e.g. ["Asad", "Bourbon"]. */
  nameLines: string[];
  tagline?: string;
  price?: string;
  cta?: string;
  media: PerfumeMedia;
}

export const carouselPerfumes: CarouselPerfume[] = [
  {
    slug: "asad-bourbon",
    brand: "Lattafa",
    name: "Asad Bourbon",
    nameLines: ["Asad", "Bourbon"],
    tagline: "Doce. Intenso. Marcante.",
    price: "R$ 249,90",
    cta: "Conhecer fragrância",
    media: {
      type: "video",
      src: "/videos/perfumes/asad-bourbon.mp4",
      poster: "/videos/perfumes/asad-bourbon-poster.jpg",
      focalPoint: { x: 0.5, y: 0.46 },
    },
  },
  {
    slug: "ck-be",
    brand: "Calvin Klein",
    name: "CK Be",
    nameLines: ["CK", "Be"],
    tagline: "Presença sem excessos.",
    price: "R$ 349,90",
    cta: "Conhecer fragrância",
    media: {
      type: "video",
      src: "/videos/perfumes/ck-be.mp4",
      poster: "/videos/perfumes/ck-be-poster.jpg",
      focalPoint: { x: 0.5, y: 0.5 },
    },
  },
  {
    slug: "212-vip-black",
    brand: "Carolina Herrera",
    name: "212 VIP Black",
    nameLines: ["212", "VIP Black"],
    tagline: "Entre. Marque. Permaneça.",
    price: "R$ 429,90",
    cta: "Conhecer fragrância",
    media: {
      type: "image",
      src: "/images/perfumes/212-vip-black.webp",
      focalPoint: { x: 0.5, y: 0.52 },
    },
  },
  {
    slug: "asad",
    brand: "Lattafa",
    name: "Asad",
    nameLines: ["Asad"],
    tagline: "Intensidade que deixa presença.",
    price: "R$ 199,90",
    cta: "Conhecer fragrância",
    media: {
      type: "video",
      src: "/videos/perfumes/asad-lattafa.mp4",
      poster: "/videos/perfumes/asad-lattafa-poster.jpg",
      focalPoint: { x: 0.5, y: 0.5 },
    },
  },
];
