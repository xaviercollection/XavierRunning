import Image from "next/image";
import { CategorySection } from "@/components/categories/CategorySection";
import { findPublicImage } from "@/lib/assets";
import { SplitTitle } from "@/components/ui/SplitTitle";

const CATEGORY_BACKDROPS = [
  { src: "/images/store/xavier-category-clothing.webp", position: "34% 48%" },
  { src: "/images/store/xavier-category-accessories.webp", position: "32% 42%" },
  { src: "/images/store/xavier-category-perfumes.webp", position: "68% 46%" },
];

export function StoreShowcase() {
  const imageSrc =
    findPublicImage("images/store/xavier-store-showcase", ["jpg", "png", "webp"]) ||
    "/images/store/xavier-store-showcase.webp";

  return (
    <div className="relative overflow-hidden">
      <div className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 grid grid-cols-3 opacity-55">
          {CATEGORY_BACKDROPS.map((backdrop, index) => (
            <div key={backdrop.src} className="relative overflow-hidden">
              <Image
                src={backdrop.src}
                alt=""
                fill
                sizes="34vw"
                className="scale-[1.04] object-cover"
                style={{
                  objectPosition: backdrop.position,
                  filter: "brightness(0.46) saturate(0.66)",
                  transform: `translateY(${index === 1 ? "-1.5%" : "1.5%"}) scale(1.07)`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/35" />
            </div>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,3,0.48)_0%,rgba(3,3,3,0.22)_42%,rgba(3,3,3,0.72)_100%)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#030303]"
        />

        <CategorySection />
      </div>

      <section
        id="vitrine"
        className="relative flex min-h-[clamp(500px,68svh,760px)] w-full items-end overflow-hidden py-[clamp(4rem,8vw,6rem)] md:items-center"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-72"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 18%, black 84%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 18%, black 84%, transparent 100%)",
          }}
        >
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[58%_center] md:object-[54%_48%]"
            style={{ filter: "blur(1.5px) brightness(0.38) saturate(0.78)" }}
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,3,0.48)_0%,rgba(3,3,3,0.08)_36%,rgba(3,3,3,0.52)_100%)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 68% 50%, rgba(200,164,93,0.12) 0%, rgba(200,164,93,0) 44%)",
          }}
        />

        <span
          aria-hidden="true"
          className="absolute left-[clamp(1.25rem,4vw,3rem)] top-6 text-[9px] tracking-[0.35em] text-ink-faint uppercase md:text-[10px]"
        >
          Xavier Store / 01
        </span>
        <span
          aria-hidden="true"
          className="absolute right-[clamp(1.25rem,4vw,3rem)] top-6 hidden text-right text-[9px] tracking-[0.35em] text-ink-faint uppercase md:block md:text-[10px]"
        >
          Aberto online · 24h
        </span>

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
            <a href="/loja" className="btn-xc mt-10">
              Explorar a loja
              <span aria-hidden="true" className="arrow">
                →
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
