"use client";

// Painel da sacola. Extraído de Storefront.tsx para reaproveitar o mesmo estado de carrinho
// (CartProvider) tanto na vitrine quanto, futuramente, em qualquer outra página — mas o
// markup/estilo é o mesmo drawer que já existia ali, só reconectado ao estado compartilhado.

import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { formatStorePrice } from "@/lib/storeCatalog";
import { attributesForType } from "@/lib/store/productType";
import { buildWhatsAppUrl, resolveWhatsappNumber, type WhatsAppLine } from "@/lib/store/whatsapp";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  /** WhatsApp configurado no painel (store_settings). Vazio/inválido cai no número padrão. */
  whatsapp: string;
}

export function CartDrawer({ open, onClose, whatsapp }: CartDrawerProps) {
  const { items, count, totalCents, removeItem, increment, decrement, clear } = useCart();
  const total = totalCents / 100;

  // Finaliza pelo WhatsApp: nada é gravado no banco e o estoque NÃO é alterado (ver
  // lib/store/whatsapp.ts) — o pedido é só uma mensagem; o lojista confirma e baixa manualmente.
  function checkoutOnWhatsApp() {
    if (items.length === 0) return;
    const lines: WhatsAppLine[] = items.map((item) => ({
      name: item.name,
      brand: item.brand,
      quantity: item.quantity,
      unitPrice: item.price,
      volumeMl: item.volumeMl,
      size: item.size,
      sizeLabel: attributesForType(item.productType).sizeLabel,
      color: item.color,
    }));
    const url = buildWhatsAppUrl(resolveWhatsappNumber(whatsapp), lines);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(url);
  }

  return (
    <div
      className={`fixed inset-0 z-[100] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`}
        aria-label="Fechar sacola"
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#080808] transition-transform duration-700 [transition-timing-function:var(--ease-xavier)] ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Sacola de compras"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-6 py-6">
          <div>
            <p className="eyebrow">Sua seleção</p>
            <h2 className="mt-2 font-display text-3xl">Sacola ({count})</h2>
          </div>
          {items.length > 0 && (
            <Image
              src="/images/cart/cart-bag-only.webp"
              alt=""
              width={1402}
              height={1122}
              sizes="80px"
              className="pointer-events-none ml-auto h-20 w-20 shrink-0 object-contain"
            />
          )}
          <button type="button" onClick={onClose} className="p-2 text-ink-muted hover:text-ink" aria-label="Fechar sacola">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {items.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center text-center">
              <Image
                src="/images/cart/cart-empty-owner.webp"
                alt="Dono da Xavier Collection sentado, ajustando os óculos"
                width={1145}
                height={1374}
                sizes="240px"
                className="pointer-events-none h-[clamp(120px,30dvh,280px)] w-auto max-w-full shrink-0 object-contain"
              />
              <p className="mt-5 font-display text-2xl">Sua sacola está vazia.</p>
              <p className="mt-2 max-w-xs text-sm text-ink-muted">
                Explore a coleção e escolha as peças que combinam com sua presença.
              </p>
              <button type="button" onClick={onClose} className="btn-xc mt-8">
                Continuar explorando
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => {
                const atMax = item.quantity >= item.stock;
                const sizeLabel = attributesForType(item.productType).sizeLabel;
                const attributes = [
                  item.volumeMl ? `${item.volumeMl}ml` : null,
                  item.size ? `${sizeLabel} ${item.size}` : null,
                  item.color ? `Cor ${item.color}` : null,
                ].filter((value): value is string => Boolean(value));

                return (
                  <div key={item.key} className="grid grid-cols-[88px_1fr] gap-4 border-b border-white/[0.07] pb-6">
                    <div className="relative aspect-[3/4] overflow-hidden bg-surface-2">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="88px"
                        className={item.imageFit === "contain" ? "object-contain p-2" : "object-cover"}
                        style={{ objectPosition: item.imagePosition ?? "50% 45%" }}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <p className="text-[9px] tracking-[0.25em] text-gold uppercase">{item.brand}</p>
                      <h3 className="mt-1 font-display text-xl leading-tight">{item.name}</h3>
                      {attributes.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-ink-faint">
                          {attributes.map((attr) => (
                            <span key={attr}>{attr}</span>
                          ))}
                        </p>
                      )}
                      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                        <div className="flex items-center border border-white/10">
                          <button
                            type="button"
                            onClick={() => decrement(item.key)}
                            className="h-8 w-8 text-ink-muted hover:text-gold"
                            aria-label={`Diminuir quantidade de ${item.name}`}
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-[10px]">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => increment(item.key)}
                            disabled={atMax}
                            title={atMax ? "Quantidade máxima em estoque" : undefined}
                            className="h-8 w-8 text-ink-muted hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Aumentar quantidade de ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm text-champagne">{formatStorePrice(item.price * item.quantity)}</span>
                      </div>
                      {atMax && (
                        <p className="mt-2 text-[9px] tracking-[0.14em] text-amber-300 uppercase">
                          Estoque máximo nesta sacola
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="mt-3 self-start text-[9px] tracking-[0.18em] text-ink-faint uppercase transition-colors hover:text-red-300"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 border-t border-white/10 p-6">
            <div className="flex items-end justify-between">
              <span className="text-[10px] tracking-[0.25em] text-ink-muted uppercase">Total estimado</span>
              <span className="font-display text-3xl text-champagne">{formatStorePrice(total)}</span>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
              Frete e condições serão definidos na etapa de atendimento.
            </p>
            <button type="button" onClick={checkoutOnWhatsApp} className="btn-xc btn-xc-gold mt-6 w-full justify-center">
              Finalizar pelo WhatsApp
            </button>
            <button
              type="button"
              onClick={clear}
              className="mt-3 w-full text-center text-[9px] tracking-[0.2em] text-ink-faint uppercase transition-colors hover:text-red-300"
            >
              Limpar sacola
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}
