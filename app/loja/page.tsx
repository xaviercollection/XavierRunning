import type { Metadata } from "next";
import { Storefront } from "@/components/shop/Storefront";
import { DEFAULT_STORE_SETTINGS, safeImageSrc } from "@/lib/store/mappers";
import { getPublicStoreData } from "@/lib/store/queries";
import { getProductImagesPublicPrefix } from "@/lib/supabase/env";

// O lojista edita catálogo/configuração no painel e a loja precisa refletir na hora:
// esta rota é renderizada a cada requisição (nada é congelado no build).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getPublicStoreData();
  return {
    title: settings.seoTitle || DEFAULT_STORE_SETTINGS.seoTitle,
    description: settings.seoDescription || DEFAULT_STORE_SETTINGS.seoDescription,
  };
}

export default async function StorePage() {
  const { products, categories, settings } = await getPublicStoreData();

  return (
    <Storefront
      products={products}
      categories={categories}
      hero={{
        eyebrow: settings.eyebrow,
        title: settings.title || DEFAULT_STORE_SETTINGS.title,
        description: settings.description,
        imageSrc: safeImageSrc(settings.heroImage, getProductImagesPublicPrefix()),
      }}
      whatsapp={settings.whatsapp}
    />
  );
}
