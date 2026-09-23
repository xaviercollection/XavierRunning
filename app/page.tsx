import { ExperienceShell } from "@/components/ExperienceShell";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { Storefront } from "@/components/shop/Storefront";
import { DEFAULT_STORE_SETTINGS, safeImageSrc } from "@/lib/store/mappers";
import { getPublicStoreData } from "@/lib/store/queries";
import { getProductImagesPublicPrefix } from "@/lib/supabase/env";

// A home agora mostra o catálogo real (mesmos dados/componente de /loja): o lojista edita no
// painel e precisa refletir na hora, então esta rota também roda a cada requisição.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { products, categories, settings } = await getPublicStoreData();

  return (
    <ExperienceShell
      catalog={
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
          embedded
        />
      }
      footer={<SiteFooter />}
    />
  );
}
