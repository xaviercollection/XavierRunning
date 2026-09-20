import Image from "next/image";

type Category = {
  number: string;
  name: string;
  description: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
  objectPosition?: string;
  size: "hero" | "feature" | "compact";
  placeholder?: "eyewear" | "watch";
};

const CATEGORIES: Category[] = [
  {
    number: "01",
    name: "Roupas",
    description: "Seleções que carregam atitude, da rua ao essencial.",
    href: "#colecao-roupas",
    imageSrc: "/images/store/xavier-category-clothing.webp",
    imageAlt: "Araras com roupas disponíveis na Xavier Collection",
    objectPosition: "34% 45%",
    size: "hero",
  },
  {
    number: "02",
    name: "Perfumes",
    description: "Fragrâncias para deixar presença em cada chegada.",
    href: "#fragrancias",
    imageSrc: "/images/store/xavier-category-perfumes.webp",
    imageAlt: "Prateleiras de perfumes disponíveis na Xavier Collection",
    objectPosition: "68% 43%",
    size: "feature",
  },
  {
    number: "03",
    name: "Óculos",
    description: "Armações selecionadas para definir o olhar.",
    href: "#vitrine",
    imageSrc: "/images/store/xavier-category-accessories.webp",
    imageAlt: "Óculos disponíveis na Xavier Collection",
    objectPosition: "30% 38%",
    size: "compact",
    placeholder: "eyewear",
  },
  {
    number: "04",
    name: "Relógios",
    description: "Detalhes que acompanham o seu ritmo.",
    href: "#vitrine",
    imageSrc: "/images/store/xavier-category-perfumes.webp",
    imageAlt: "Relógios disponíveis na Xavier Collection",
    objectPosition: "76% 78%",
    size: "compact",
    placeholder: "watch",
  },
];

export function CategorySection() {
  return (
    <section
      id="categorias"
      aria-labelledby="categorias-title"
      className="relative z-10 overflow-hidden pb-[clamp(2.5rem,5vw,4rem)] pt-[clamp(5rem,9vw,8rem)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[-0.04em] top-[8%] select-none font-display text-[18vw] leading-none text-white/[0.025]"
      >
        XC
      </span>

      <div className="xc-container relative z-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Seleção · Xavier Collection</p>
            <h2
              id="categorias-title"
              className="mt-4 max-w-3xl text-[clamp(2.5rem,5vw,4.75rem)] font-medium leading-[0.9] tracking-[-0.055em] text-ink text-balance"
            >
              Explore a Xavier.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted md:text-right">
            Moda, perfumaria e acessórios escolhidos para completar a sua presença.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.name} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <a
      href={category.href}
      className="group relative flex min-h-[10.5rem] overflow-hidden border border-white/10 bg-[#080808]/90 p-3 backdrop-blur-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold sm:min-h-[12rem] sm:p-4"
    >
      {category.imageSrc ? (
        <Image
          src={category.imageSrc}
          alt={category.imageAlt ?? ""}
          fill
          sizes={
            category.size === "hero"
              ? "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          }
          className="object-cover transition-transform duration-[1200ms] ease-out motion-reduce:transition-none group-hover:scale-[1.045]"
          style={{ objectPosition: category.objectPosition ?? "50% 42%" }}
        />
      ) : (
        <CategoryPlaceholder type={category.placeholder!} />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,3,0.12)_0%,rgba(3,3,3,0.1)_34%,rgba(3,3,3,0.84)_100%)] transition-colors duration-700 group-hover:bg-[linear-gradient(180deg,rgba(3,3,3,0.02)_0%,rgba(3,3,3,0.12)_34%,rgba(3,3,3,0.7)_100%)]" />
      <div className="pointer-events-none absolute inset-0 border border-transparent transition-colors duration-500 group-hover:border-gold/35" />

      <span className="relative z-10 font-display text-xs tracking-[0.22em] text-champagne/80 transition-transform duration-500 group-hover:-translate-y-1">
        {category.number}
      </span>

      <div className="relative z-10 mt-auto max-w-[24rem] transition-transform duration-500 group-hover:-translate-y-1">
        <p className="text-[9px] tracking-[0.32em] text-gold/90 uppercase">Categoria</p>
        <div className="mt-1.5 flex items-end justify-between gap-4">
          <h3 className="text-[clamp(1.45rem,2.7vw,2.75rem)] font-medium leading-[0.9] tracking-[-0.05em] text-ink">
            {category.name}
          </h3>
          <span
            aria-hidden="true"
            className="mb-1 text-xl leading-none text-champagne/80 transition-transform duration-500 group-hover:translate-x-1.5"
          >
            →
          </span>
        </div>
        <p className="mt-2 hidden max-w-[28ch] text-[11px] leading-relaxed text-ink-muted transition-colors duration-500 group-hover:text-ink/80 sm:block">
          {category.description}
        </p>
      </div>
    </a>
  );
}

function CategoryPlaceholder({ type }: { type: "eyewear" | "watch" }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#070707]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_24%,rgba(200,164,93,0.14),transparent_28%),linear-gradient(135deg,#0e0e0d_0%,#050505_68%)]" />
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:34px_34px]" />
      {type === "eyewear" ? <EyewearMark /> : <WatchMark />}
    </div>
  );
}

function EyewearMark() {
  return (
    <svg viewBox="0 0 320 180" className="absolute left-1/2 top-[42%] w-[82%] -translate-x-1/2 -translate-y-1/2 text-champagne/45 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04] group-hover:-rotate-2" fill="none" aria-hidden="true">
      <path d="M20 82h45l9 43c3 16 18 27 36 27h19c18 0 33-11 36-27l8-43h-45m19 0h45l8 43c3 16 18 27 36 27h19c18 0 33-11 36-27l9-43h45" stroke="currentColor" strokeWidth="3" />
      <path d="M147 83c8-10 18-10 26 0M20 82L5 65M300 82l15-17" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function WatchMark() {
  return (
    <svg viewBox="0 0 260 220" className="absolute left-1/2 top-[40%] h-[76%] -translate-x-1/2 -translate-y-1/2 text-champagne/45 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.045] group-hover:rotate-3" fill="none" aria-hidden="true">
      <rect x="94" y="6" width="72" height="208" rx="12" stroke="currentColor" strokeWidth="2" opacity=".7" />
      <circle cx="130" cy="110" r="62" fill="#090909" stroke="currentColor" strokeWidth="3" />
      <circle cx="130" cy="110" r="46" stroke="currentColor" strokeWidth="1" opacity=".65" />
      <path d="M130 74v38l27 17M130 59v7M130 154v7M79 110h7M174 110h7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="130" cy="110" r="4" fill="currentColor" />
    </svg>
  );
}
