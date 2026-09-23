"use client";

import Image from "next/image";
import { useCallback, useState, type ReactNode } from "react";
import { LoaderScreen } from "@/components/loader/LoaderScreen";
import { SiteHeader } from "@/components/header/SiteHeader";
import { HeroSection } from "@/components/hero/HeroSection";
import { SeamBloom } from "@/components/ui/SeamBloom";
import { useCart } from "@/components/cart/CartProvider";

// Home simplificada: Hero -> catálogo real (Storefront embutido) -> footer, sem seções
// editoriais entre os dois. Os componentes que costumavam ficar aqui (carrosséis de perfume/
// roupa, StoreShowcase, StoreLocation) continuam no projeto — só pararam de ser renderizados
// nesta página; nada foi apagado.

interface ExperienceShellProps {
  /** Catálogo real da loja (mesmo componente/dados de /loja), já embutido (sem header/hero/footer próprios). */
  catalog: ReactNode;
  footer: ReactNode;
}

export function ExperienceShell({ catalog, footer }: ExperienceShellProps) {
  const [heroReady, setHeroReady] = useState(false);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const handleLoadProgress = useCallback((ratio: number) => {
    setLoadProgress((prev) => {
      const next = Math.round(ratio * 100);
      return next > prev ? next : prev;
    });
  }, []);

  const handleReady = useCallback(() => {
    setLoadProgress(100);
    setHeroReady(true);
  }, []);

  return (
    <>
      <div aria-hidden="true" className="grain-fixed" />

      {loaderMounted && (
        <LoaderScreen
          progress={loadProgress}
          ready={heroReady}
          onDone={() => setLoaderMounted(false)}
        />
      )}

      <div className="relative z-10 w-full overflow-x-clip">
        <SiteHeader />

        <main>
          <HeroSection
            onReady={handleReady}
            onLoadProgress={handleLoadProgress}
          />

          <SeamBloom />

          {catalog}
        </main>

        {footer}
      </div>

      {!loaderMounted && <FloatingCartButton />}
    </>
  );
}

// Antes era um link `#produtos`: parecia um segundo botão de sacola mas só rolava a
// página, sem abrir o carrinho de fato. Agora abre a mesma sacola do header.
function FloatingCartButton() {
  const { count: cartCount, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={cartCount > 0 ? `Abrir sacola com ${cartCount} itens` : "Abrir sacola"}
      className="group fixed bottom-5 right-5 z-40 h-16 w-16 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold md:bottom-7 md:right-7 md:h-20 md:w-20"
    >
      {/* O card visual (fundo, borda, recorte da imagem) fica num wrapper à parte: o
          overflow-hidden dele não pode recortar o selo de quantidade, que precisa
          "vazar" para fora do quadrado como um badge de notificação de app. */}
      <span className="relative block h-full w-full overflow-hidden rounded-2xl border border-white/15 bg-black/55 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[transform,border-color,background-color] duration-300 group-hover:scale-105 group-hover:border-gold/60 group-hover:bg-black/70">
        <Image
          src="/images/cart/cart-floating-bag.webp"
          alt=""
          aria-hidden="true"
          fill
          sizes="80px"
          className="object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"
        />
      </span>
      {cartCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-medium text-black ring-2 ring-[#080808]">
          {cartCount}
        </span>
      )}
    </button>
  );
}

