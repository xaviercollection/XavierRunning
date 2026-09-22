import "server-only";
import { cache } from "react";
import type { StoreProduct } from "@/lib/storeCatalog";
import { getProductImagesPublicPrefix } from "@/lib/supabase/env";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import {
  ADMIN_PRODUCT_COLUMNS,
  CATEGORY_COLUMNS,
  PUBLIC_PRODUCT_COLUMNS,
  STORE_SETTINGS_COLUMNS,
} from "./columns";
import {
  toAdminCategory,
  toAdminProduct,
  toStoreProduct,
  toStoreSettings,
  type CategoryRow,
  type ProductRow,
  type StoreSettingsRow,
} from "./mappers";
import type { AdminCategory, AdminProduct, StoreSettings } from "./types";

function assertNoError(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`Falha ao carregar ${what}: ${error.message}`);
}

export interface PublicStoreData {
  products: StoreProduct[];
  /** Nomes das categorias visíveis, na ordem definida no painel. */
  categories: string[];
  settings: StoreSettings;
}

/**
 * Leitura da loja pública com cliente anônimo: a RLS entrega só o que o cliente pode ver.
 * `cache` deduplica dentro da mesma requisição (generateMetadata + página = uma leitura só).
 */
export const getPublicStoreData = cache(async (): Promise<PublicStoreData> => {
  const supabase = createPublicClient();
  const storagePrefix = getProductImagesPublicPrefix();

  const [categoriesResult, productsResult, settingsResult] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_COLUMNS.join(","))
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .overrideTypes<CategoryRow[], { merge: false }>(),
    supabase
      .from("products")
      .select(PUBLIC_PRODUCT_COLUMNS.join(","))
      .order("created_at", { ascending: false })
      .overrideTypes<ProductRow[], { merge: false }>(),
    supabase
      .from("store_settings")
      .select(STORE_SETTINGS_COLUMNS.join(","))
      .eq("id", true)
      .maybeSingle<StoreSettingsRow>(),
  ]);

  assertNoError(categoriesResult.error, "as categorias");
  assertNoError(productsResult.error, "os produtos");
  assertNoError(settingsResult.error, "a configuração da loja");

  const categories = categoriesResult.data ?? [];
  const byId = new Map(categories.map((category) => [category.id, toAdminCategory(category)]));

  const products = (productsResult.data ?? []).flatMap((row) => {
    const category = byId.get(row.category_id);
    return category ? [toStoreProduct(row, category, storagePrefix)] : [];
  });

  return {
    products,
    categories: categories.map((category) => category.name),
    settings: toStoreSettings(settingsResult.data),
  };
});

export interface AdminStoreData {
  products: AdminProduct[];
  categories: AdminCategory[];
  settings: StoreSettings;
}

/** Leitura do painel com a sessão do administrador (RLS libera rascunhos, ocultos e estoque). */
export async function getAdminStoreData(): Promise<AdminStoreData> {
  const supabase = await createClient();
  const storagePrefix = getProductImagesPublicPrefix();

  const [categoriesResult, productsResult, settingsResult] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_COLUMNS.join(","))
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .overrideTypes<CategoryRow[], { merge: false }>(),
    supabase
      .from("products")
      .select(ADMIN_PRODUCT_COLUMNS.join(","))
      .order("created_at", { ascending: false })
      .overrideTypes<ProductRow[], { merge: false }>(),
    supabase
      .from("store_settings")
      .select(STORE_SETTINGS_COLUMNS.join(","))
      .eq("id", true)
      .maybeSingle<StoreSettingsRow>(),
  ]);

  assertNoError(categoriesResult.error, "as categorias");
  assertNoError(productsResult.error, "os produtos");
  assertNoError(settingsResult.error, "a configuração da loja");

  const categories = categoriesResult.data ?? [];
  const byId = new Map(categories.map((category) => [category.id, toAdminCategory(category)]));
  const fallbackCategory = { name: "Sem categoria", productType: "generic" as const };

  return {
    products: (productsResult.data ?? []).map((row) =>
      toAdminProduct(row, byId.get(row.category_id) ?? fallbackCategory, storagePrefix),
    ),
    categories: categories.map(toAdminCategory),
    settings: toStoreSettings(settingsResult.data),
  };
}
