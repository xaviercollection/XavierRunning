"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultVariant, isProductSoldOut, type CartVariant } from "@/lib/store/cart";
import { attributesForType } from "@/lib/store/productType";
import { formatStorePrice, type StoreProduct } from "@/lib/storeCatalog";

type AddResult = { ok: true } | { ok: false; reason: "sold-out" | "max-stock" };

interface ProductQuickViewProps {
  product: StoreProduct;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
  onAdd: (variant: CartVariant, quantity: number) => AddResult;
  onViewCart: () => void;
}

export function ProductQuickView({
  product,
  favorite,
  onFavorite,
  onClose,
  onAdd,
  onViewCart,
}: ProductQuickViewProps) {
  const attrs = attributesForType(product.productType);
  const soldOut = isProductSoldOut(product);
  const needsSize = attrs.sizes && product.sizes.length > 1;
  const needsColor = attrs.colors && product.colors.length > 1;
  const fallback = useMemo(() => defaultVariant(product), [product]);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const maxQuantity = Math.max(1, Math.min(product.stock ?? 99, 99));
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function clearResult() {
    setMessage("");
    setAdded(false);
  }

  function handleAdd() {
    if (soldOut) return;
    if (needsSize && !size) {
      setMessage(`Selecione ${attrs.sizeLabel === "Numeração" ? "a numeração" : "um tamanho"}.`);
      return;
    }
    if (needsColor && !color) {
      setMessage("Selecione uma cor.");
      return;
    }

    const result = onAdd(
      {
        size: needsSize ? size : fallback.size,
        color: needsColor ? color : fallback.color,
      },
      quantity,
    );

    if (!result.ok) {
      setMessage(result.reason === "max-stock" ? "A quantidade máxima em estoque já está na sacola." : "Produto esgotado.");
      return;
    }
    setMessage(`${product.name} foi adicionado à sacola.`);
    setAdded(true);
  }

  return (
    <div
      className="store-backdrop-enter fixed inset-0 z-[90] flex items-end justify-center bg-black/80 backdrop-blur-md md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-quick-view-title"
      aria-describedby={product.description ? "product-quick-view-description" : undefined}
    >
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Fechar detalhes do produto" />

      <div
        ref={panelRef}
        className="store-drawer-enter relative z-10 grid h-[100svh] w-full max-w-6xl overflow-hidden border border-white/10 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,.65)] md:h-auto md:max-h-[92svh] md:grid-cols-[1.05fr_.95fr]"
      >
        <div className="relative min-h-[38svh] overflow-hidden bg-[#0c0c0c] md:min-h-[min(720px,88svh)]">
          <Image
            src={product.image}
            alt={`${product.name} — ${product.brand}`}
            fill
            priority
            sizes="(min-width: 768px) 52vw, 100vw"
            className={`${product.imageFit === "contain" ? "object-contain p-[9%]" : "object-cover"} store-product-image-enter`}
            style={{ objectPosition: product.imagePosition ?? "50% 45%" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2 md:left-6 md:top-6">
            {discount > 0 && (
              <span className="bg-gold px-3 py-2 text-[8px] tracking-[0.22em] text-black uppercase">-{discount}%</span>
            )}
            {product.badge && (
              <span className={`px-3 py-2 text-[8px] tracking-[0.22em] uppercase backdrop-blur-md ${soldOut ? "bg-black/75 text-ink-muted" : "bg-champagne text-black"}`}>
                {soldOut ? "Esgotado" : product.badge}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onFavorite}
            className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-ink backdrop-blur-md transition-colors hover:border-gold/50 hover:text-gold md:bottom-6 md:right-6"
            aria-label={favorite ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}
            aria-pressed={favorite}
          >
            <HeartIcon className="h-4 w-4" filled={favorite} />
          </button>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-16 md:px-12 md:pb-10 md:pt-12">
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center border border-white/10 bg-black/40 text-ink-muted transition-colors hover:border-gold/40 hover:text-gold"
              aria-label="Fechar detalhes"
            >
              <CloseIcon className="h-5 w-5" />
            </button>

            <p className="eyebrow">{product.brand} · {product.category}</p>
            <h2 id="product-quick-view-title" className="mt-4 font-display text-[clamp(2.7rem,5vw,5rem)] leading-[0.92] tracking-[-0.045em]">
              {product.name}
            </h2>

            <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
              {discount > 0 && product.originalPrice && (
                <span className="text-sm text-ink-faint line-through">{formatStorePrice(product.originalPrice)}</span>
              )}
              <span className={`text-2xl ${discount > 0 ? "text-gold" : "text-champagne"}`}>{formatStorePrice(product.price)}</span>
              {attrs.volume && product.volumeMl && (
                <span className="pb-1 text-[10px] tracking-[0.18em] text-ink-faint uppercase">{product.volumeMl}ml</span>
              )}
            </div>

            {product.description && (
              <p id="product-quick-view-description" className="mt-7 max-w-lg whitespace-pre-line text-sm leading-7 text-ink-muted">
                {product.description}
              </p>
            )}

            {attrs.colors && product.colors.length > 0 && (
              <div className="mt-8">
                <p className="text-[9px] tracking-[0.3em] text-ink-faint uppercase">{needsColor ? "Selecione a cor" : "Cor"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.colors.map((item) => {
                    const selected = needsColor ? color === item.name : product.colors.length === 1;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => { setColor(item.name); clearResult(); }}
                        aria-pressed={selected}
                        disabled={!needsColor}
                        className={`flex items-center gap-2 border px-3 py-2 text-[10px] transition-colors ${selected ? "border-gold bg-gold/10 text-gold" : "border-white/15 text-ink-muted hover:border-white/40"} disabled:cursor-default`}
                      >
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: item.hex }} />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {attrs.sizes && product.sizes.length > 0 && (
              <div className="mt-8">
                <p className="text-[9px] tracking-[0.3em] text-ink-faint uppercase">
                  {needsSize ? `Selecione ${attrs.sizeLabel === "Numeração" ? "a numeração" : "o tamanho"}` : attrs.sizeLabel}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((item) => {
                    const selected = needsSize ? size === item : product.sizes.length === 1;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => { setSize(item); clearResult(); }}
                        aria-pressed={selected}
                        disabled={!needsSize}
                        className={`min-w-11 border px-3 py-2.5 text-[10px] transition-colors ${selected ? "border-gold bg-gold text-black" : "border-white/15 text-ink-muted hover:border-white/40"} disabled:cursor-default`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!soldOut && (
              <div className="mt-8">
                <p className="text-[9px] tracking-[0.3em] text-ink-faint uppercase">Quantidade</p>
                <div className="mt-3 inline-flex items-center border border-white/15">
                  <button type="button" onClick={() => { setQuantity((current) => Math.max(1, current - 1)); clearResult(); }} disabled={quantity <= 1} className="h-11 w-11 text-lg text-ink-muted transition-colors hover:text-gold disabled:opacity-30" aria-label="Diminuir quantidade">−</button>
                  <span className="flex h-11 min-w-12 items-center justify-center border-x border-white/15 text-sm text-champagne" aria-live="polite">{quantity}</span>
                  <button type="button" onClick={() => { setQuantity((current) => Math.min(maxQuantity, current + 1)); clearResult(); }} disabled={quantity >= maxQuantity} className="h-11 w-11 text-lg text-ink-muted transition-colors hover:text-gold disabled:opacity-30" aria-label="Aumentar quantidade">+</button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.08] bg-[#080808]/95 p-5 backdrop-blur-xl md:px-12 md:py-7">
            {message && (
              <p role="status" className={`mb-4 text-[11px] ${added ? "text-gold" : "text-champagne"}`}>{message}</p>
            )}
            {added ? (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onClose} className="btn-xc justify-center">Continuar explorando</button>
                <button type="button" onClick={onViewCart} className="btn-xc btn-xc-gold justify-center">Ver sacola</button>
              </div>
            ) : (
              <button
                type="button"
                disabled={soldOut}
                onClick={handleAdd}
                className="btn-xc btn-xc-gold w-full justify-center disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-ink-faint"
              >
                {soldOut ? "Produto esgotado" : "Adicionar à sacola"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type IconProps = { className?: string };

function HeartIcon({ className, filled = false }: IconProps & { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true"><path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.5 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" /></svg>;
}

function CloseIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>;
}
