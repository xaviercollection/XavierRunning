"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { LoaderScreen } from "@/components/loader/LoaderScreen";
import { SiteHeader } from "@/components/header/SiteHeader";
import { HeroSection } from "@/components/hero/HeroSection";
import { SeamBloom } from "@/components/ui/SeamBloom";

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

      {!loaderMounted && <FloatingShopButton />}
    </>
  );
}

function FloatingShopButton() {
  return (
    <Link
      href="#produtos"
      aria-label="Ir para o catálogo"
      className="group fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-champagne shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition-[transform,border-color,color,background-color] duration-300 hover:scale-105 hover:border-gold/60 hover:bg-black/75 hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold md:bottom-7 md:right-7"
    >
      <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.35} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-px">
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    </Link>
  );
}

