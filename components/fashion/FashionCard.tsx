"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { FashionPiece } from "@/lib/fashion";

interface FashionCardProps {
  piece: FashionPiece;
  hasImage: boolean;
  featured?: boolean;
  className?: string;
}

export function FashionCard({ piece, hasImage, featured, className }: FashionCardProps) {
  const imageRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  const handleEnter = () => {
    if (reducedMotion || !imageRef.current) return;
    gsap.to(imageRef.current, { scale: 1.05, duration: 0.9, ease: "power3.out" });
  };
  const handleLeave = () => {
    if (reducedMotion || !imageRef.current) return;
    gsap.to(imageRef.current, { scale: 1, duration: 0.7, ease: "power3.out" });
  };

  return (
    <a
      href="#vitrine"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`group relative block overflow-hidden rounded-[2px] border border-white/10 transition-colors duration-500 hover:border-gold/40 ${className ?? ""}`}
    >
      <div ref={imageRef} className="absolute inset-0">
        {hasImage ? (
          <Image
            src={`/${piece.imagePath}`}
            alt={`${piece.brand || piece.name} — ${piece.category}`}
            fill
            sizes={featured ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"}
            className="object-cover"
          />
        ) : (
          <FashionPlaceholder piece={piece} />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#060504]/95 via-[#060504]/25 to-transparent" />

      <div className={`relative flex h-full flex-col justify-end p-6 ${featured ? "md:p-9" : "md:p-7"}`}>
        <p className="text-[10px] tracking-[0.32em] text-gold uppercase md:text-xs">{piece.category}</p>
        <h3 className={`mt-2 font-display text-ink ${featured ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"}`}>
          {piece.brand || piece.name}
        </h3>
        <p className="mt-2 max-w-[26ch] text-xs text-ink-muted md:text-sm">{piece.description}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-ink uppercase transition-colors duration-300 group-hover:text-gold">
          Ver Peça
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </a>
  );
}

/** Refined stand-in until the real photo lands — a monogram and the same
 * copy the finished card will carry, not a generic "coming soon" box. */
function FashionPlaceholder({ piece }: { piece: FashionPiece }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b0a08] via-[#080706] to-[#040302]">
      <div className="absolute inset-5 border border-dashed border-gold/20" />
      <span className="font-display text-[20vw] leading-none text-white/[0.04] md:text-[8vw]">
        {(piece.brand || piece.name).charAt(0)}
      </span>
    </div>
  );
}
