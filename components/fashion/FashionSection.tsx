import Image from "next/image";
import { fashionPieces, type FashionPiece } from "@/lib/fashion";
import { findPublicImage } from "@/lib/assets";
import { SplitTitle } from "@/components/ui/SplitTitle";

export function FashionSection() {
  return (
    <section id="colecao" className="relative xc-section">
      <div className="xc-container">
        <div className="mb-14 flex flex-col gap-8 md:mb-20 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Coleção · Selected Goods</p>
            <SplitTitle
              variant="rise"
              text="Vista sua identidade."
              className="mt-5 max-w-2xl font-display text-[clamp(2.5rem,6.5vw,5.5rem)] leading-[0.95] text-ink text-balance"
            />
          </div>
          <div className="flex flex-col items-start gap-5 md:items-end md:text-right">
            <p className="max-w-sm text-sm leading-relaxed text-ink-muted text-balance">
              Camiseta autoral, ícones atemporais e alfaiataria essencial — uma seleção
              pensada para construir presença camada a camada.
            </p>
            <a href="#fragrancias" className="link-xc">
              Explorar a coleção
              <span aria-hidden="true" className="arrow">
                →
              </span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {fashionPieces.map((piece, i) => (
            <FashionProductCard key={piece.slug} piece={piece} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FashionProductCard({ piece, index }: { piece: FashionPiece; index: number }) {
  const src = findPublicImage(piece.imagePath, ["jpg", "jpeg", "webp", "png"]);

  return (
    <a href="#vitrine" className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2px] border border-white/10 bg-[#080604]/40 transition-colors duration-500 group-hover:border-gold/40">
        {src ? (
          <Image
            src={src}
            alt={piece.name}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
            className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <FashionPlaceholder piece={piece} />
        )}

        <span
          aria-hidden="true"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center border border-white/10 bg-black/40 font-display text-xs tracking-widest text-gold"
        >
          {String(index).padStart(2, "0")}
        </span>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
      </div>

      <div className="mt-5 flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] tracking-[0.32em] text-gold uppercase">{piece.category}</p>
          <h3 className="mt-1.5 font-display text-lg tracking-wider text-ink lg:text-xl">
            {piece.name}
          </h3>
          <p className="mt-2 max-w-[30ch] text-xs leading-relaxed text-ink-muted">
            {piece.description}
          </p>
        </div>
        <span className="mt-1 whitespace-nowrap font-display text-sm text-gold md:text-base">
          {piece.price}
        </span>
      </div>

      <span className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[0.24em] text-ink-muted uppercase transition-colors duration-300 group-hover:text-gold">
        Ver produto
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </span>
    </a>
  );
}

function FashionPlaceholder({ piece }: { piece: FashionPiece }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b0a08] via-[#080706] to-[#040302]">
      <div className="absolute inset-4 border border-dashed border-gold/20" />
      <span className="font-display text-[8rem] leading-none text-white/[0.04]">
        {(piece.brand || piece.name).charAt(0)}
      </span>
    </div>
  );
}