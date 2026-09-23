"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/components/cart/CartProvider";
import { formatStorePrice, type StoreProduct } from "@/lib/storeCatalog";
import { defaultVariant, isProductSoldOut, productRequiresVariant, type CartVariant } from "@/lib/store/cart";
import { attributesForType } from "@/lib/store/productType";

type SortMode = "featured" | "price-asc" | "price-desc" | "popular";

const COLOR_FILTERS = ["Preto", "Areia", "Azul", "Verde", "Branco", "Marrom", "Dourado"];

// Faixa do filtro de preço. O teto acompanha o produto mais caro do catálogo (mínimo 700, como
// sempre foi), para que um produto novo acima de R$ 700 nunca fique inalcançável pelo filtro.
const PRICE_FLOOR = 150;
const PRICE_CEILING_MIN = 700;

export interface StorefrontProps {
  /** Catálogo publicado (vem do Supabase; a RLS já removeu rascunhos e categorias ocultas). */
  products: StoreProduct[];
  /** Nomes das categorias visíveis, na ordem definida no painel. */
  categories: string[];
  hero: { eyebrow: string; title: string; description: string; imageSrc: string };
  /** WhatsApp configurado no painel. Vazio/inválido => número padrão da loja. */
  whatsapp: string;
  /**
   * true quando embutido em outra página (ex.: a home) que já tem seu próprio header/hero/rodapé.
   * Nesse caso a vitrine renderiza só o catálogo em si (categorias, filtros, grade de produtos,
   * modal de variação e sacola) — sem duplicar header/hero/footer/grão de fundo.
   */
  embedded?: boolean;
}

export function Storefront({ products: catalog, categories, hero, whatsapp, embedded = false }: StorefrontProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [sortMode, setSortMode] = useState<SortMode>("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickView, setQuickView] = useState<StoreProduct | null>(null);
  const [quickSize, setQuickSize] = useState("");
  const [quickColor, setQuickColor] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState("");
  const [priceLimit, setPriceLimit] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  // Estado do drawer é compartilhado (ver CartProvider): o header da home precisa abrir o mesmo
  // drawer que o botão de sacola aqui dentro.
  const { count: cartCount, addItem, isOpen: cartOpen, openCart, closeCart } = useCart();

  const brands = useMemo(
    () => Array.from(new Set(catalog.map((product) => product.brand))).sort(),
    [catalog],
  );
  const sizes = useMemo(
    () =>
      Array.from(
        new Set(
          catalog.flatMap((product) => (attributesForType(product.productType).sizes ? product.sizes : [])),
        ),
      ),
    [catalog],
  );
  const priceCeiling = useMemo(
    () =>
      Math.max(
        PRICE_CEILING_MIN,
        Math.ceil(Math.max(0, ...catalog.map((product) => product.price)) / 50) * 50,
      ),
    [catalog],
  );
  const maxPrice = Math.min(priceLimit ?? priceCeiling, priceCeiling);

  const titleBreak = hero.title.lastIndexOf(" ");
  const heroTitleFirstLine = titleBreak > 0 ? hero.title.slice(0, titleBreak) : hero.title;
  const heroTitleLastLine = titleBreak > 0 ? hero.title.slice(titleBreak + 1) : "";

  const overlayOpen = cartOpen || quickView !== null;

  useEffect(() => {
    if (!overlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
        setQuickView(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeCart]);

  const products = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = catalog.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        `${product.brand} ${product.name} ${product.category}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);
      const matchesCategory =
        activeCategory === "Todos" || product.category === activeCategory;
      const matchesBrand =
        selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      const matchesSize =
        selectedSizes.length === 0 ||
        selectedSizes.some((size) => product.sizes.includes(size));
      const matchesColor =
        !selectedColor || product.colors.some((color) => color.name === selectedColor);

      return (
        matchesQuery &&
        matchesCategory &&
        matchesBrand &&
        matchesSize &&
        matchesColor &&
        product.price <= maxPrice
      );
    });

    return filtered.sort((a, b) => {
      if (sortMode === "price-asc") return a.price - b.price;
      if (sortMode === "price-desc") return b.price - a.price;
      if (sortMode === "popular") return (a.featured ?? 99) - (b.featured ?? 99);
      return (a.badge === "Novo" ? -1 : 0) - (b.badge === "Novo" ? -1 : 0);
    });
  }, [activeCategory, catalog, maxPrice, query, selectedBrands, selectedColor, selectedSizes, sortMode]);

  const categorizedProducts = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          products: products.filter((product) => product.category === category),
        }))
        .filter((group) => group.products.length > 0),
    [categories, products],
  );

  const promotionProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.originalPrice !== undefined && product.originalPrice > product.price,
      ),
    [products],
  );

  const activeFilterCount =
    selectedBrands.length +
    selectedSizes.length +
    (selectedColor ? 1 : 0) +
    (maxPrice < priceCeiling ? 1 : 0);

  function toggleListValue(
    value: string,
    values: string[],
    setValues: (next: string[]) => void,
  ) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function resetFilters() {
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedColor("");
    setPriceLimit(null);
  }

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2600);
  }

  function feedbackForResult(productName: string, result: { ok: boolean; reason?: "sold-out" | "max-stock" }) {
    if (result.ok) return `${productName} adicionada à sacola.`;
    return result.reason === "max-stock"
      ? "Quantidade máxima em estoque já está na sacola."
      : "Produto esgotado.";
  }

  // CTA "Adicionar à sacola" do card: produto sem variação obrigatória entra direto na sacola;
  // produto com mais de um tamanho e/ou mais de uma cor abre o mesmo modal de detalhes para
  // que o cliente escolha antes de confirmar (o volume nunca é uma escolha do cliente).
  function handleAddToBagClick(product: StoreProduct) {
    if (isProductSoldOut(product)) return;
    if (productRequiresVariant(product)) {
      setQuickSize("");
      setQuickColor("");
      setQuickView(product);
      return;
    }
    const result = addItem({ product, variant: defaultVariant(product), quantity: 1 });
    showFeedback(feedbackForResult(product.name, result));
  }

  function confirmAddFromQuickView() {
    if (!quickView) return;
    const attrs = attributesForType(quickView.productType);
    const needsSize = attrs.sizes && quickView.sizes.length > 1;
    const needsColor = attrs.colors && quickView.colors.length > 1;
    if ((needsSize && !quickSize) || (needsColor && !quickColor)) return;

    const fallback = defaultVariant(quickView);
    const variant: CartVariant = {
      size: needsSize ? quickSize : fallback.size,
      color: needsColor ? quickColor : fallback.color,
    };
    const result = addItem({ product: quickView, variant, quantity: 1 });
    showFeedback(feedbackForResult(quickView.name, result));
    if (result.ok) setQuickView(null);
  }

  const Wrapper = embedded ? "div" : "main";

  return (
    <Wrapper className={embedded ? "bg-void text-ink" : "min-h-screen bg-void text-ink"}>
      {!embedded && <div aria-hidden="true" className="grain-fixed" />}

      {!embedded && (
        <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.08] bg-black/75 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1680px] items-center justify-between gap-5 px-[clamp(1.25rem,4vw,3.5rem)]">
            <Link href="/" className="group flex shrink-0 items-baseline gap-3" aria-label="Voltar para Xavier Collection">
              <span className="font-display text-sm text-gold md:text-base">X</span>
              <span className="hidden font-display text-[12px] tracking-[0.3em] text-champagne uppercase transition-colors group-hover:text-gold sm:block md:text-[14px]">
                Xavier Collection
              </span>
            </Link>

            <label className="relative ml-auto hidden w-full max-w-sm md:block">
              <span className="sr-only">Buscar produtos</span>
              <SearchIcon className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="BUSCAR NA COLEÇÃO"
                className="h-10 w-full border-b border-white/10 bg-transparent pl-7 pr-3 text-[10px] tracking-[0.22em] text-ink outline-none placeholder:text-ink-faint focus:border-gold"
              />
            </label>

            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="relative flex h-10 items-center gap-2 text-[10px] tracking-[0.22em] text-ink-muted uppercase transition-colors hover:text-gold"
              aria-expanded={filtersOpen}
            >
              <FilterIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[9px] text-black">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openCart}
              className="relative flex h-10 w-10 items-center justify-center text-ink-muted transition-colors hover:text-gold"
              aria-label={`Abrir sacola com ${cartCount} itens`}
            >
              <BagIcon className="h-[18px] w-[18px]" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-medium text-black">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {!embedded && (
        <section className="relative flex min-h-[72svh] items-end overflow-hidden pb-[clamp(4rem,9vw,8rem)] pt-32">
          <Image
            src={hero.imageSrc}
            alt="Interior da Xavier Collection com roupas selecionadas"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            className="object-cover object-[45%_48%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,3,.76)_0%,rgba(3,3,3,.3)_52%,rgba(3,3,3,.1)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,3,.18)_0%,transparent_38%,rgba(3,3,3,.64)_100%)]" />

          <div className="xc-container relative z-10">
            {hero.eyebrow && <p className="eyebrow store-reveal">{hero.eyebrow}</p>}
            <h1 className="store-reveal mt-5 max-w-4xl font-display text-[clamp(4rem,10vw,9rem)] leading-[0.82] tracking-[-0.055em] text-ink [animation-delay:100ms]">
              {heroTitleFirstLine}
              {heroTitleLastLine && (
                <>
                  <br />
                  {heroTitleLastLine}
                </>
              )}
            </h1>
            <div className="store-reveal mt-8 flex max-w-2xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between [animation-delay:200ms]">
              <p className="max-w-md text-sm leading-relaxed text-white/60">{hero.description}</p>
              <a href="#produtos" className="link-xc shrink-0">
                Ver coleção <span className="arrow">↓</span>
              </a>
            </div>
          </div>

          <span className="absolute bottom-7 right-[clamp(1.25rem,4vw,3.5rem)] z-10 hidden text-[9px] tracking-[0.35em] text-white/40 uppercase md:block">
            Collection · 2026
          </span>
        </section>
      )}

      <section id="produtos" className="border-t border-white/[0.06]">
        <div
          className={`border-b border-white/[0.07] bg-[#050505]/95 backdrop-blur-xl ${embedded ? "" : "sticky top-[72px] z-30"}`}
        >
          <nav
            aria-label="Categorias de produtos"
            className="mx-auto flex max-w-[1680px] gap-7 overflow-x-auto px-[clamp(1.25rem,4vw,3.5rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {["Todos", ...categories].map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`relative shrink-0 py-5 text-[10px] tracking-[0.22em] uppercase transition-colors ${
                    active ? "text-gold" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {category}
                  <span
                    className={`absolute inset-x-0 bottom-0 h-px bg-gold transition-transform duration-500 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        </div>

        <div
          className={`overflow-hidden border-b border-white/[0.06] bg-[#070707] transition-[max-height,opacity] duration-700 ${
            filtersOpen ? "max-h-[720px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-auto grid max-w-[1680px] gap-9 px-[clamp(1.25rem,4vw,3.5rem)] py-9 sm:grid-cols-2 lg:grid-cols-4">
            <FilterGroup title="Marca">
              {brands.map((brand) => (
                <FilterCheck
                  key={brand}
                  label={brand}
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleListValue(brand, selectedBrands, setSelectedBrands)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Tamanho">
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleListValue(size, selectedSizes, setSelectedSizes)}
                    className={`min-w-10 border px-2 py-2 text-[10px] transition-colors ${
                      selectedSizes.includes(size)
                        ? "border-gold bg-gold text-black"
                        : "border-white/10 text-ink-muted hover:border-white/30 hover:text-ink"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title="Cor">
              <div className="flex flex-wrap gap-x-4 gap-y-3">
                {COLOR_FILTERS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(selectedColor === color ? "" : color)}
                    className={`border-b pb-1 text-[10px] tracking-[0.15em] uppercase transition-colors ${
                      selectedColor === color
                        ? "border-gold text-gold"
                        : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title={`Até ${formatStorePrice(maxPrice)}`}>
              <input
                type="range"
                min={PRICE_FLOOR}
                max={priceCeiling}
                step="50"
                value={maxPrice}
                onChange={(event) => setPriceLimit(Number(event.target.value))}
                className="w-full accent-[#c8a45d]"
              />
              <div className="mt-3 flex justify-between text-[9px] text-ink-faint">
                <span>{`R$ ${PRICE_FLOOR}`}</span>
                <span>{`R$ ${priceCeiling}`}</span>
              </div>
              <button type="button" onClick={resetFilters} className="link-xc mt-7">
                Limpar filtros
              </button>
            </FilterGroup>
          </div>
        </div>

        <div className="mx-auto max-w-[1680px] px-[clamp(1.25rem,4vw,3.5rem)] py-10 md:py-14">
          <div className="mb-9 flex flex-col gap-5 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">{activeCategory}</p>
              <p className="mt-2 text-xs text-ink-muted">
                {products.length.toString().padStart(2, "0")} peças encontradas
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <label className="relative block flex-1 md:hidden">
                <span className="sr-only">Buscar produtos</span>
                <SearchIcon className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="BUSCAR"
                  className="h-10 w-full min-w-0 border-b border-white/10 bg-transparent pl-7 text-[10px] tracking-[0.18em] outline-none placeholder:text-ink-faint focus:border-gold"
                />
              </label>
              <label className="flex shrink-0 items-center gap-3 text-[9px] tracking-[0.18em] text-ink-faint uppercase">
                <span className="hidden sm:inline">Ordenar</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="border border-white/10 bg-[#070707] px-3 py-2.5 text-[10px] tracking-wider text-ink outline-none focus:border-gold"
                >
                  <option value="featured">Novidades</option>
                  <option value="popular">Mais vendidos</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                </select>
              </label>
            </div>
          </div>

          {products.length > 0 ? (
            activeCategory === "Todos" ? (
              <div className="space-y-16 md:space-y-20">
                {promotionProducts.length > 0 && (
                  <CategoryCarousel
                    title="Em promoção"
                    eyebrow="Condições especiais"
                    products={promotionProducts}
                    favorites={favorites}
                    onFavorite={(productId) =>
                      toggleListValue(productId, favorites, setFavorites)
                    }
                    onAddToBag={handleAddToBagClick}
                    highlighted
                  />
                )}
                {categorizedProducts.map((group) => (
                  <CategoryCarousel
                    key={group.category}
                    title={group.category}
                    products={group.products}
                    favorites={favorites}
                    onFavorite={(productId) =>
                      toggleListValue(productId, favorites, setFavorites)
                    }
                    onAddToBag={handleAddToBagClick}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 md:gap-y-14 lg:grid-cols-4">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    favorite={favorites.includes(product.id)}
                    onFavorite={() => toggleListValue(product.id, favorites, setFavorites)}
                    onAddToBag={() => handleAddToBagClick(product)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center border border-white/[0.06] text-center">
              <p className="font-display text-3xl">Nenhuma peça encontrada.</p>
              <p className="mt-3 text-sm text-ink-muted">Tente remover algum filtro ou buscar outro termo.</p>
              <button type="button" onClick={resetFilters} className="btn-xc mt-8">
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </section>

      {!embedded && (
        <footer className="relative overflow-hidden border-t border-white/[0.06] px-[clamp(1.25rem,4vw,3.5rem)] py-14 md:py-20">
          <span className="pointer-events-none absolute inset-x-0 -bottom-8 text-center font-display text-[20vw] leading-none text-white/[0.02]">
            Xavier
          </span>
          <div className="relative z-10 mx-auto flex max-w-[1680px] flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div>
              <Link href="/" className="font-display text-2xl tracking-[0.12em] uppercase">
                Xavier Collection
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
                Boutique masculina, perfumaria e acessórios escolhidos para marcar presença.
              </p>
            </div>
            <div className="flex flex-col gap-4 text-[10px] tracking-[0.25em] text-ink-faint uppercase md:items-end">
              <span>Frontend demonstrativo · Collection 2026</span>
              <Link href="/" className="link-xc">Voltar à experiência</Link>
            </div>
          </div>
        </footer>
      )}

      {quickView && (() => {
        const quickViewAttrs = attributesForType(quickView.productType);
        return (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" aria-label={`Detalhes de ${quickView.name}`}>
          <button className="absolute inset-0 cursor-default" onClick={() => setQuickView(null)} aria-label="Fechar detalhes" />
          <div className="store-drawer-enter relative z-10 grid max-h-[92svh] w-full max-w-5xl overflow-y-auto border border-white/10 bg-[#080808] md:grid-cols-[1.05fr_.95fr]">
            <div className="relative min-h-[42svh] bg-[#0c0c0c] md:min-h-[640px]">
              <Image
                src={quickView.image}
                alt={quickView.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className={quickView.imageFit === "contain" ? "object-contain p-[10%]" : "object-cover"}
                style={{ objectPosition: quickView.imagePosition ?? "50% 45%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            </div>
            <div className="relative flex flex-col justify-center p-7 md:p-12">
              <button type="button" onClick={() => setQuickView(null)} className="absolute right-5 top-5 p-2 text-ink-muted transition-colors hover:text-ink" aria-label="Fechar">
                <CloseIcon className="h-5 w-5" />
              </button>
              <p className="eyebrow">{quickView.brand} · {quickView.category}</p>
              <h2 className="mt-4 font-display text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.94] tracking-[-0.045em]">
                {quickView.name}
              </h2>
              <p className="mt-5 flex items-baseline gap-3 text-xl text-champagne">
                {formatStorePrice(quickView.price)}
                {quickViewAttrs.volume && quickView.volumeMl && (
                  <span className="text-sm tracking-[0.12em] text-ink-faint uppercase">{quickView.volumeMl}ml</span>
                )}
              </p>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-muted">{quickView.description}</p>

              {quickViewAttrs.colors && quickView.colors.length > 1 ? (
                <div className="mt-8">
                  <p className="text-[9px] tracking-[0.3em] text-ink-faint uppercase">Selecione a cor</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickView.colors.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setQuickColor(color.name)}
                        aria-pressed={quickColor === color.name}
                        className={`flex items-center gap-2 border px-3 py-2 text-[10px] transition-colors ${quickColor === color.name ? "border-gold bg-gold/10 text-gold" : "border-white/15 text-ink-muted hover:border-white/40"}`}
                      >
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : quickViewAttrs.colors && quickView.colors.length === 1 ? (
                <div className="mt-8">
                  <p className="text-[9px] tracking-[0.3em] text-ink-faint uppercase">Cor</p>
                  <p className="mt-3 flex items-center gap-2 text-[10px] text-ink-muted">
                    <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: quickView.colors[0].hex }} />
                    {quickView.colors[0].name}
                  </p>
                </div>
              ) : null}

              {quickViewAttrs.sizes && quickView.sizes.length > 1 && (
                <div className="mt-8">
                  <p className="text-[9px] tracking-[0.3em] text-ink-faint uppercase">Selecione {quickViewAttrs.sizeLabel === "Numeração" ? "a numeração" : "o tamanho"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickView.sizes.map((size) => (
                      <button key={size} type="button" onClick={() => setQuickSize(size)} aria-pressed={quickSize === size} className={`min-w-11 border px-3 py-2.5 text-[10px] ${quickSize === size ? "border-gold bg-gold text-black" : "border-white/15 text-ink-muted hover:border-white/40"}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const soldOut = isProductSoldOut(quickView);
                const missingSize = quickViewAttrs.sizes && quickView.sizes.length > 1 && !quickSize;
                const missingColor = quickViewAttrs.colors && quickView.colors.length > 1 && !quickColor;
                const label = soldOut
                  ? "Produto esgotado"
                  : missingSize
                    ? `Selecione ${quickViewAttrs.sizeLabel === "Numeração" ? "a numeração" : "um tamanho"}`
                    : missingColor
                      ? "Selecione uma cor"
                      : "Adicionar à sacola";
                return (
                  <button
                    type="button"
                    disabled={soldOut || missingSize || missingColor}
                    onClick={confirmAddFromQuickView}
                    className="btn-xc btn-xc-gold mt-10 justify-center disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-ink-faint"
                  >
                    {label}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
        );
      })()}

      <CartDrawer open={cartOpen} onClose={closeCart} whatsapp={whatsapp} />

      <div
        role="status"
        className={`fixed bottom-6 right-6 z-[120] border border-gold/25 bg-[#111] px-5 py-3 text-[11px] text-champagne shadow-2xl transition-all duration-500 ${feedback ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
      >
        {feedback}
      </div>
    </Wrapper>
  );
}

function CategoryCarousel({
  title,
  eyebrow = "Seleção Xavier",
  products,
  favorites,
  onFavorite,
  onAddToBag,
  highlighted = false,
}: {
  title: string;
  eyebrow?: string;
  products: StoreProduct[];
  favorites: string[];
  onFavorite: (productId: string) => void;
  onAddToBag: (product: StoreProduct) => void;
  highlighted?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  function scrollRail(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left: direction * Math.max(280, railRef.current.clientWidth * 0.76),
      behavior: "smooth",
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    // Clique em botão/link (ex.: "Adicionar à sacola", favoritar) não pode virar arraste: sem
    // este corte, o setPointerCapture abaixo redireciona o click sintético inteiro para o rail
    // (não para o botão), e o clique nunca chega ao onClick — a sacola parecia "não funcionar"
    // sempre que o produto estava dentro de um carrossel (aba "Todos", a visão padrão da loja).
    if ((event.target as HTMLElement).closest("button, a")) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag.active) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5) drag.moved = true;
    event.currentTarget.scrollLeft = drag.scrollLeft - distance;
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section aria-label={`Produtos: ${title}`}>
      <div
        className={`mb-6 flex items-end justify-between gap-5 border-b pb-4 md:mb-8 ${
          highlighted ? "border-gold/30" : "border-white/[0.06]"
        }`}
      >
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2
            className={`mt-2 font-display text-[clamp(2.2rem,5vw,4.5rem)] leading-none tracking-[-0.035em] ${
              highlighted ? "text-gold" : ""
            }`}
          >
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-2 hidden text-[8px] tracking-[0.22em] text-ink-faint uppercase md:inline">
            Arraste para explorar
          </span>
          <button
            type="button"
            onClick={() => scrollRail(-1)}
            className="flex h-10 w-10 items-center justify-center border border-white/10 text-ink-muted transition-colors hover:border-gold/60 hover:text-gold"
            aria-label={`Ver produtos anteriores de ${title}`}
          >
            <CarouselArrowIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(1)}
            className="flex h-10 w-10 items-center justify-center border border-white/10 text-ink-muted transition-colors hover:border-gold/60 hover:text-gold"
            aria-label={`Ver próximos produtos de ${title}`}
          >
            <CarouselArrowIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 select-none md:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!dragRef.current.moved) return;
          event.preventDefault();
          event.stopPropagation();
          dragRef.current.moved = false;
        }}
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[42vw] lg:w-[23vw] xl:w-[20vw]"
          >
            <ProductCard
              product={product}
              index={index}
              favorite={favorites.includes(product.id)}
              onFavorite={() => onFavorite(product.id)}
              onAddToBag={() => onAddToBag(product)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  index,
  favorite,
  onFavorite,
  onAddToBag,
}: {
  product: StoreProduct;
  index: number;
  favorite: boolean;
  onFavorite: () => void;
  onAddToBag: () => void;
}) {
  const soldOut = isProductSoldOut(product);
  const effectiveBadge = soldOut ? "Esgotado" : product.badge;
  const ctaLabel = soldOut ? "Esgotado" : "Adicionar à sacola";
  const attrs = attributesForType(product.productType);
  return (
    <article className="store-card-enter group min-w-0" style={{ animationDelay: `${Math.min(index, 7) * 70}ms` }}>
      <div className="relative aspect-[3/4] overflow-hidden bg-[#0a0a0a]">
        <Image
          src={product.image}
          alt={`${product.name} — ${product.brand}`}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
          className={`${product.imageFit === "contain" ? "object-contain p-[12%]" : "object-cover"} transition-transform duration-[1100ms] [transition-timing-function:var(--ease-xavier)] group-hover:scale-[1.045]`}
          style={{ objectPosition: product.imagePosition ?? "50% 45%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

        {(effectiveBadge || product.originalPrice) && (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5 md:left-4 md:top-4">
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="bg-gold px-2.5 py-1.5 text-[8px] tracking-[0.25em] text-black uppercase shadow-[0_8px_30px_rgba(200,164,93,.18)]">
                Em promoção
              </span>
            )}
            {effectiveBadge && (
              <span className={`px-2.5 py-1.5 text-[8px] tracking-[0.25em] uppercase backdrop-blur-md ${effectiveBadge === "Esgotado" ? "bg-black/70 text-ink-muted" : "bg-champagne text-black"}`}>
                {effectiveBadge}
              </span>
            )}
          </div>
        )}

        <button type="button" onClick={onFavorite} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-ink backdrop-blur-md transition-colors hover:text-gold md:right-4 md:top-4" aria-label={favorite ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}>
          <HeartIcon className="h-4 w-4" filled={favorite} />
        </button>

        <button
          type="button"
          onClick={onAddToBag}
          disabled={soldOut}
          className="absolute inset-x-3 bottom-3 translate-y-3 border border-white/20 bg-black/70 py-3 text-[9px] tracking-[0.28em] text-ink uppercase opacity-0 backdrop-blur-md transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-70 md:inset-x-4 md:bottom-4"
        >
          {ctaLabel}
        </button>
      </div>

      <div className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] tracking-[0.3em] text-gold uppercase md:text-[9px]">{product.brand}</p>
            <h3 className="mt-1 truncate font-display text-[clamp(1.1rem,2vw,1.55rem)] leading-tight">{product.name}</h3>
            {attrs.volume && product.volumeMl && (
              <p className="mt-0.5 text-[9px] tracking-[0.16em] text-ink-faint uppercase">{product.volumeMl}ml</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            {product.originalPrice && product.originalPrice > product.price && (
              <p className="text-[9px] text-ink-faint line-through md:text-[10px]">
                {formatStorePrice(product.originalPrice)}
              </p>
            )}
            <p className={`text-xs md:text-sm ${product.originalPrice ? "text-gold" : "text-champagne"}`}>
              {formatStorePrice(product.price)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onAddToBag}
            disabled={soldOut}
            className="text-[8px] tracking-[0.2em] text-ink-muted uppercase transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-60 md:text-[9px]"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-5 text-[9px] tracking-[0.32em] text-gold uppercase">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function FilterCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[11px] text-ink-muted transition-colors hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={`flex h-4 w-4 items-center justify-center border ${checked ? "border-gold bg-gold text-black" : "border-white/20"}`}>
        {checked && <span className="text-[10px]">✓</span>}
      </span>
      {label}
    </label>
  );
}

type IconProps = { className?: string };

function SearchIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
}

function FilterIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
}

function BagIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
}

function HeartIcon({ className, filled = false }: IconProps & { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true"><path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.5 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" /></svg>;
}

function CloseIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>;
}

function CarouselArrowIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}
