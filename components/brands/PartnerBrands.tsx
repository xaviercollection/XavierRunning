"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { SplitTitle } from "@/components/ui/SplitTitle";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const BRANDS = [
  { name: "Crosby", note: "Alfaiataria" },
  { name: "EAG", note: "Streetwear" },
  { name: "Strike", note: "Calçados" },
];

/**
 * The brand moment: three wordmarks treated like campaign credits, not logo
 * boxes. Big whitespace, hairline separators, a faint oversized XC watermark
 * and a restrained scroll entrance — the Xavier name stays dominant.
 */
export function BrandStrip() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rowRef.current,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="marcas"
      className="relative overflow-hidden border-y border-white/5 xc-section"
    >
      {/* Faint oversized monogram — reads as a print detail, not a logo wall */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center font-display text-[30vw] leading-none text-white/[0.025]"
      >
        XC
      </span>

      <div className="relative z-10">
        <div className="xc-container text-center">
          <p className="eyebrow">Vendedor autorizado</p>
          <SplitTitle
            variant="converge"
            text="Marcas que constroem a presença."
            className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2rem,5.5vw,4.5rem)] leading-[1.02] text-ink text-balance"
          />
          <p className="mx-auto mt-5 max-w-md text-sm text-ink-muted">
            Distribuição oficial das marcas que vestem o estilo Xavier.
          </p>
        </div>

        <div
          ref={rowRef}
          className="mx-auto mt-14 flex w-full max-w-5xl flex-col px-[clamp(1.25rem,5vw,4rem)] md:mt-20 md:flex-row md:px-8"
        >
          {BRANDS.map((brand, i) => (
            <div
              key={brand.name}
              className="group flex flex-col items-center gap-3 border-t border-white/5 py-10 first:border-t-0 md:flex-1 md:border-l md:border-t-0 md:py-4 md:first:border-l-0"
            >
              <span className="text-[9px] tracking-[0.4em] text-ink-faint uppercase">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-[clamp(2rem,6vw,4rem)] leading-none text-ink transition-colors duration-500 group-hover:text-gold">
                {brand.name}
              </span>
              <span className="text-[10px] tracking-[0.3em] text-ink-faint uppercase">
                {brand.note}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-14 flex items-center justify-center gap-4 md:mt-16">
          <span aria-hidden="true" className="hidden h-px w-10 bg-gold/50 md:block" />
          <p className="text-center text-[9px] tracking-[0.4em] text-ink-faint uppercase">
            Xavier Collection · Verified Partner
          </p>
          <span aria-hidden="true" className="hidden h-px w-10 bg-gold/50 md:block" />
        </div>
      </div>
    </section>
  );
}