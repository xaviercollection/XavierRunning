import Image from "next/image";
import { findPublicImage } from "@/lib/assets";
import { SplitTitle } from "@/components/ui/SplitTitle";

export function StoreShowcase() {
  const imageSrc =
    findPublicImage("images/store/xavier-store-shelf", ["jpg", "png", "webp"]) ||
    "/images/store/xavier-store-shelf.jpg";

  return (
    <section
      id="vitrine"
      className="relative flex min-h-[clamp(560px,82svh,920px)] w-full items-end overflow-hidden py-[clamp(4rem,9vw,7rem)] md:items-center"
    >
      {/* LAYER 1 — local light: the store shelf photo as a translucent wash
          that dissolves into the global background (mask fades both edges
          over a long range), so this section reads as a lighting change on
          the same canvas — never a new picture box. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
        }}
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center md:object-[60%_center]"
          style={{ filter: "blur(4px) brightness(0.5) saturate(0.8)" }}
        />
      </div>

      {/* LAYER 2 — gentle local deepening only behind the copy side, kept well
          under the global vignette so there is no box edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_60%,transparent_0%,rgba(3,3,3,0.28)_55%,transparent_85%)]"
      />

      {/* LAYER 3 — faint champagne breath, jewelry not floodlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 68% 50%, rgba(200,164,93,0.10) 0%, rgba(200,164,93,0) 42%)",
        }}
      />

      {/* HUD labels */}
      <span
        aria-hidden="true"
        className="absolute left-[clamp(1.25rem,4vw,3rem)] top-[5rem] text-[9px] tracking-[0.35em] text-ink-faint uppercase md:text-[10px]"
      >
        Xavier Store / 01
      </span>
      <span
        aria-hidden="true"
        className="absolute right-[clamp(1.25rem,4vw,3rem)] top-[5rem] hidden text-right text-[9px] tracking-[0.35em] text-ink-faint uppercase md:block md:text-[10px]"
      >
        Aberto online · 24h
      </span>

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1680px] flex-col items-center px-[clamp(1.25rem,5vw,4rem)] text-center md:items-end md:text-right">
        <div className="flex max-w-xl flex-col items-center text-center md:items-end md:text-right">
          <p className="eyebrow">Vitrine digital</p>
          <SplitTitle
            variant="orbit"
            text="Veja sem sair de casa o que tem na loja."
            className="mt-5 font-display text-[clamp(2.25rem,6.5vw,5.5rem)] leading-[1] text-ink text-balance"
          />
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-muted">
            Perfumes, roupas e novidades da Xavier Collection com uma experiência
            prática, visual e feita para você.
          </p>
          <a href="#contato" className="btn-xc mt-10">
            Explorar a loja
            <span aria-hidden="true" className="arrow">
              →
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}