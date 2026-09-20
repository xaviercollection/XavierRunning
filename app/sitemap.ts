import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: [
        absoluteUrl("/images/brand/xavier-symbol-3d.webp"),
        absoluteUrl("/images/store/xavier-store-showcase.webp"),
      ],
    },
    {
      url: absoluteUrl("/loja"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
      images: [
        absoluteUrl("/images/store/xavier-category-clothing.webp"),
        absoluteUrl("/images/store/xavier-category-perfumes.webp"),
        absoluteUrl("/images/store/xavier-category-accessories.webp"),
      ],
    },
  ];
}
