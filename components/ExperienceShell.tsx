"use client";

import { useCallback, useState, type ReactNode } from "react";
import { LoaderScreen } from "@/components/loader/LoaderScreen";
import { SiteHeader } from "@/components/header/SiteHeader";
import { HeroSection } from "@/components/hero/HeroSection";
import { GlobalBackground } from "@/components/background/GlobalBackground";
import { ArabicPerfumeScroll } from "@/components/perfumes/ArabicPerfumeScroll";
import { SeamBloom } from "@/components/ui/SeamBloom";
import { ClothingCarousel } from "@/components/fashion/ClothingCarousel";
import { StoreLocation } from "@/components/store/StoreLocation";
import { carouselClothing } from "@/lib/clothingCatalog";

interface ExperienceShellProps {
  storeShowcase: ReactNode;
  footer: ReactNode;
}

export function ExperienceShell({ storeShowcase, footer }: ExperienceShellProps) {
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
      <GlobalBackground />
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

          <ArabicPerfumeScroll />

          <SeamBloom />

          <ClothingCarousel id="colecao-roupas" items={carouselClothing} />

          <SeamBloom />

          {storeShowcase}

          <SeamBloom />

          <StoreLocation />
        </main>

        <SeamBloom />

        {footer}
      </div>
    </>
  );
}

