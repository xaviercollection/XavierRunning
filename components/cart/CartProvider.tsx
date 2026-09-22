"use client";

// Estado da sacola, compartilhado entre a vitrine (/loja) e o header da home via Context.
// Persistência em localStorage — não existe tabela de carrinho/pedidos no Supabase (ver
// supabase/migrations/20260921120000_store_schema.sql).
//
// Usa useSyncExternalStore (não useState+useEffect) de propósito: no servidor e na primeira
// renderização do cliente (hidratação), getServerSnapshot devolve sempre a mesma sacola vazia
// — sem isso o React acusaria mismatch de hidratação sempre que já existisse algo salvo. Depois
// de montado, o primeiro subscribe carrega o localStorage e notifica os assinantes.

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { StoreProduct } from "@/lib/storeCatalog";
import {
  cartCount,
  cartItemFromProduct,
  cartItemKey,
  cartTotalCents,
  clampQuantity,
  isProductSoldOut,
  type CartItem,
  type CartVariant,
} from "@/lib/store/cart";

const STORAGE_KEY = "xavier-collection:cart:v1";
const EMPTY_ITEMS: CartItem[] = [];

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.key === "string" &&
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.quantity) &&
    (item.quantity as number) > 0
  );
}

function readStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Store externo (fora do ciclo de render do React): um único carrinho por aba do navegador.
// ---------------------------------------------------------------------------

let itemsCache: CartItem[] = EMPTY_ITEMS;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsCache));
  } catch {
    // Armazenamento indisponível (modo privado, cota etc.): a sacola some ao recarregar,
    // mas isso não pode derrubar a compra em andamento.
  }
}

function updateItems(updater: (current: CartItem[]) => CartItem[]) {
  itemsCache = updater(itemsCache);
  persist();
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    itemsCache = readStoredCart();
    notify();
  }
  return () => listeners.delete(listener);
}

function getSnapshot(): CartItem[] {
  return itemsCache;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type AddResult = { ok: true } | { ok: false; reason: "sold-out" | "max-stock" };

interface CartContextValue {
  items: CartItem[];
  count: number;
  totalCents: number;
  addItem: (input: { product: StoreProduct; variant: CartVariant; quantity?: number }) => AddResult;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback<CartContextValue["addItem"]>(({ product, variant, quantity = 1 }) => {
    if (isProductSoldOut(product)) return { ok: false, reason: "sold-out" };
    const stock = product.stock ?? Number.MAX_SAFE_INTEGER;
    const key = cartItemKey(product.id, variant);

    let result: AddResult = { ok: true };
    updateItems((current) => {
      const existing = current.find((item) => item.key === key);
      const nextQuantity = clampQuantity((existing?.quantity ?? 0) + quantity, stock);

      if (nextQuantity <= 0) {
        result = { ok: false, reason: "sold-out" };
        return current;
      }
      if (existing && nextQuantity === existing.quantity) {
        result = { ok: false, reason: "max-stock" };
        return current;
      }
      if (existing) {
        return current.map((item) => (item.key === key ? { ...item, quantity: nextQuantity, stock } : item));
      }
      return [...current, cartItemFromProduct(product, variant, nextQuantity)];
    });
    return result;
  }, []);

  const removeItem = useCallback((key: string) => {
    updateItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    updateItems((current) =>
      current.flatMap((item) => {
        if (item.key !== key) return [item];
        const clamped = clampQuantity(quantity, item.stock);
        return clamped > 0 ? [{ ...item, quantity: clamped }] : [];
      }),
    );
  }, []);

  const increment = useCallback((key: string) => {
    updateItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, quantity: clampQuantity(item.quantity + 1, item.stock) } : item,
      ),
    );
  }, []);

  const decrement = useCallback((key: string) => {
    updateItems((current) =>
      current.flatMap((item) => {
        if (item.key !== key) return [item];
        const next = item.quantity - 1;
        return next > 0 ? [{ ...item, quantity: next }] : [];
      }),
    );
  }, []);

  const clear = useCallback(() => updateItems(() => []), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      totalCents: cartTotalCents(items),
      addItem,
      removeItem,
      setQuantity,
      increment,
      decrement,
      clear,
    }),
    [items, addItem, removeItem, setQuantity, increment, decrement, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de um <CartProvider>.");
  return context;
}
