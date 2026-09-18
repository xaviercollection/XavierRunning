"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { SplitTitle } from "@/components/ui/SplitTitle";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const LINES = ["Vista", "Sua", "Identidade"];

export function FashionTransition() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const ruleRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ruleRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
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
      className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-[clamp(6rem,16vw,12rem)] text-center"
    >
      <p className="eyebrow">Coleção · New Season</p>
      <SplitTitle
        lines={LINES}
        variant="converge"
        lineParallax
        className="mt-6 font-display text-[clamp(3.5rem,13vw,9rem)] uppercase leading-[0.92] text-ink"
      />
      <div ref={ruleRef} className="rule-gold mt-8 w-20 origin-center" />
      <p className="mt-6 max-w-md text-sm text-ink-muted">
        Do streetwear de presença à alfaiataria que dita o tom. Curadoria assinada para o seu guarda-roupa.
      </p>
    </section>
  );
}
