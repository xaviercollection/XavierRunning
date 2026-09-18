"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { SplitTitle } from "@/components/ui/SplitTitle";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface StorePhotoRevealProps {
  imageSrc: string | null;
}

export function StorePhotoReveal({ imageSrc }: StorePhotoRevealProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });

      tl.fromTo(
        curtainRef.current,
        { scaleX: 1 },
        { scaleX: 0, duration: 1.3, ease: "power4.inOut", transformOrigin: "right" },
      ).fromTo(
        copyRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
        "-=0.6",
      );

      gsap.fromTo(
        imageWrapRef.current,
        { scale: 1.1 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div
      ref={sectionRef}
      className="relative flex flex-col overflow-hidden px-6 py-20 md:flex-row md:items-center md:gap-12 md:px-16 md:py-28 lg:gap-20"
    >
      <div
        ref={frameRef}
        className="relative aspect-[4/5] w-full overflow-hidden md:aspect-[3/4] md:w-[60%] lg:w-[62%]"
      >
        <div ref={imageWrapRef} className="absolute inset-0">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt="Loja física Xavier Collection"
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
            />
          ) : (
            <StorePlaceholder />
          )}
        </div>
        {!reducedMotion && (
          <div ref={curtainRef} className="pointer-events-none absolute inset-0 bg-void" />
        )}
      </div>

      <div ref={copyRef} className="mt-10 md:mt-0 md:w-[40%] lg:w-[38%]">
        <p className="text-xs tracking-[0.4em] text-gold uppercase">Vitrine digital</p>
        <SplitTitle
          variant="rise"
          text="Veja sem sair de casa o que tem na minha loja."
          className="mt-5 font-display text-4xl leading-[1.05] text-ink text-balance md:text-5xl lg:text-6xl"
        />
        <p className="mt-6 max-w-md text-sm text-ink-muted md:text-base">
          Explore perfumes, roupas e novidades da Xavier Collection com uma experiência
          prática, visual e feita para você.
        </p>
        <a
          href="#vitrine"
          className="mt-8 inline-flex items-center gap-3 border border-gold/40 px-7 py-3.5 text-xs tracking-[0.25em] text-ink uppercase transition-colors duration-300 hover:border-gold hover:text-gold md:text-sm"
        >
          Explorar a loja
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}

function StorePlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-surface-2 via-surface to-void">
      <div className="absolute inset-5 border border-gold/20" />
      <span className="font-display text-lg tracking-wide text-ink-faint md:text-xl">
        Xavier Collection
      </span>
      <span className="text-[10px] tracking-[0.35em] text-ink-faint/70 uppercase">
        Store Image
      </span>
    </div>
  );
}
