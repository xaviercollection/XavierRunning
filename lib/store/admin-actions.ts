"use server";

// Server Actions do painel. Regras:
//   * Toda action revalida sessão + is_admin() (o proxy não protege Server Functions por si só).
//   * As escritas usam o cliente com o JWT do administrador: a RLS do banco é a autoridade final.
//   * Nenhuma action toca em estoque além do valor que o lojista digitou no editor.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductImagesPublicPrefix } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_PRODUCT_COLUMNS, PRODUCT_IMAGES_BUCKET } from "./columns";
import { toAdminProduct, toStoreSettings, type ProductRow, type StoreSettingsRow } from "./mappers";
import type {
  ActionResult,
  AdminProduct,
  FeaturedState,
  ProductStatus,
  StoreSettings,
} from "./types";
import {
  isUuid,
  parseProductInput,
  parseStoreSettingsInput,
  PRODUCT_STATUS_VALUES,
  slugCandidate,
  slugify,
  toProductRow,
  toStoreSettingsRow,
} from "./validation";

const fail = (error: string): ActionResult<never> => ({ ok: false, error });
const done = <T>(data: T): ActionResult<T> => ({ ok: true, data });

interface DbError {
  code?: string;
  message: string;
}

function describeDbError(error: DbError): string {
  switch (error.code) {
    case "23514":
      return "Algum valor não passou nas regras do banco (preço, imagem, tamanhos ou tamanho de texto).";
    case "23505":
      return "Já existe um registro com esse identificador.";
    case "23503":
    case "23001":
      return "Esse registro está em uso e não pode ser removido/alterado.";
    case "42501":
      return "Sem permissão de administrador para esta operação.";
    default:
      console.error("[admin-actions] erro do banco:", error.code, error.message);
      return "Não foi possível concluir a operação. Tente novamente.";
  }
}

/**
 * Porta única de entrada de toda action: exige sessão válida + is_admin() e captura QUALQUER
 * exceção (rede, Supabase fora do ar, env ausente) devolvendo { ok:false } em vez de lançar —
 * assim o painel nunca fica preso em "Salvando…". A validação de entrada roda dentro de `run`,
 * então quem não é admin não recebe nem mensagens de validação.
 */
async function withAdmin<T>(
  run: (supabase: SupabaseClient) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return fail("Sessão expirada. Entre novamente.");

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError || isAdmin !== true) return fail("Sem permissão de administrador.");

    return await run(supabase);
  } catch (error) {
    console.error("[admin-actions] falha inesperada:", error);
    return fail("Não foi possível concluir a operação. Tente novamente.");
  }
}

const PRODUCT_SELECT = `${ADMIN_PRODUCT_COLUMNS.join(",")}, category:categories(name)`;
type ProductWithCategory = ProductRow & { category: { name: string } | null };

async function fetchAdminProduct(supabase: SupabaseClient, id: string): Promise<AdminProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle<ProductWithCategory>();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toAdminProduct(data, data.category?.name ?? "Sem categoria", getProductImagesPublicPrefix());
}

/** Caminho do objeto dentro do bucket, se a URL for uma imagem enviada pelo painel. */
function storageObjectPath(imageUrl: string): string | null {
  const prefix = getProductImagesPublicPrefix();
  return imageUrl.startsWith(prefix) ? decodeURIComponent(imageUrl.slice(prefix.length)) : null;
}

/** Limpeza best-effort: imagem órfã no bucket não deve fazer a operação principal falhar. */
async function removeStoredImage(supabase: SupabaseClient, imageUrl: string | null | undefined) {
  const path = imageUrl ? storageObjectPath(imageUrl) : null;
  if (!path) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  if (error) console.warn("[admin-actions] não foi possível remover imagem antiga:", error.message);
}

export async function saveProductAction(input: unknown): Promise<ActionResult<AdminProduct>> {
  return withAdmin(async (supabase) => {
    const parsed = parseProductInput(input, getProductImagesPublicPrefix());
    if (!parsed.ok) return fail(parsed.error);
    const product = parsed.value;

    let productId = product.id;
    let previousImage: string | null = null;
    let currentlyFeatured = false;

    if (productId) {
      const { data: existing, error: readError } = await supabase
        .from("products")
        .select("image_url, is_featured")
        .eq("id", productId)
        .maybeSingle<{ image_url: string; is_featured: boolean }>();
      if (readError) return fail(describeDbError(readError));
      if (!existing) return fail("Produto não encontrado.");
      previousImage = existing.image_url;
      currentlyFeatured = existing.is_featured;

      const { error } = await supabase.from("products").update(toProductRow(product)).eq("id", productId);
      if (error) return fail(describeDbError(error));
    } else {
      const baseSlug = slugify(`${product.brand} ${product.name}`);
      for (let attempt = 0; attempt < 4 && !productId; attempt += 1) {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...toProductRow(product), slug: slugCandidate(baseSlug, attempt) })
          .select("id")
          .single<{ id: string }>();
        if (!error) {
          productId = data.id;
        } else if (error.code !== "23505" || attempt === 3) {
          return fail(describeDbError(error));
        }
      }
      if (!productId) return fail("Não foi possível gerar um identificador único para o produto.");
    }

    if (product.isFeatured !== currentlyFeatured) {
      const { error } = await supabase.rpc("set_product_featured", {
        p_id: productId,
        p_featured: product.isFeatured,
      });
      if (error) return fail(describeDbError(error));
    }

    if (previousImage && previousImage !== product.image) await removeStoredImage(supabase, previousImage);

    const saved = await fetchAdminProduct(supabase, productId);
    return saved ? done(saved) : fail("Produto salvo, mas não foi possível recarregá-lo.");
  });
}

export async function deleteProductAction(id: string): Promise<ActionResult<{ id: string }>> {
  if (!isUuid(id)) return fail("Identificador do produto inválido.");

  return withAdmin(async (supabase) => {
    const { data: existing } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", id)
      .maybeSingle<{ image_url: string }>();

    const { data, error } = await supabase.from("products").delete().eq("id", id).select("id");
    if (error) return fail(describeDbError(error));
    if (!data || data.length === 0) return fail("Produto não encontrado ou sem permissão para remover.");

    await removeStoredImage(supabase, existing?.image_url);
    return done({ id });
  });
}

export async function setProductStatusAction(
  id: string,
  status: ProductStatus,
): Promise<ActionResult<{ id: string; status: ProductStatus }>> {
  if (!isUuid(id) || !PRODUCT_STATUS_VALUES.includes(status)) return fail("Dados inválidos.");

  return withAdmin(async (supabase) => {
    const { data, error } = await supabase.from("products").update({ status }).eq("id", id).select("id");
    if (error) return fail(describeDbError(error));
    if (!data || data.length === 0) return fail("Produto não encontrado.");
    return done({ id, status });
  });
}

async function readFeaturedState(supabase: SupabaseClient): Promise<FeaturedState[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, is_featured, featured_rank")
    .returns<Array<{ id: string; is_featured: boolean; featured_rank: number | null }>>();
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    isFeatured: row.is_featured,
    featured: row.featured_rank,
  }));
}

export async function setProductFeaturedAction(
  id: string,
  featured: boolean,
): Promise<ActionResult<FeaturedState[]>> {
  if (!isUuid(id)) return fail("Identificador do produto inválido.");

  return withAdmin(async (supabase) => {
    const { error } = await supabase.rpc("set_product_featured", { p_id: id, p_featured: featured });
    if (error) return fail(describeDbError(error));
    return done(await readFeaturedState(supabase));
  });
}

export async function reorderFeaturedAction(ids: string[]): Promise<ActionResult<FeaturedState[]>> {
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isUuid)) return fail("Ordem inválida.");

  return withAdmin(async (supabase) => {
    const { error } = await supabase.rpc("reorder_featured", { p_ids: ids });
    if (error) return fail(describeDbError(error));
    return done(await readFeaturedState(supabase));
  });
}

export async function setCategoryVisibilityAction(
  id: string,
  visible: boolean,
): Promise<ActionResult<{ id: string; visible: boolean }>> {
  if (!isUuid(id) || typeof visible !== "boolean") return fail("Dados inválidos.");

  return withAdmin(async (supabase) => {
    const { data, error } = await supabase.from("categories").update({ is_visible: visible }).eq("id", id).select("id");
    if (error) return fail(describeDbError(error));
    if (!data || data.length === 0) return fail("Categoria não encontrada.");
    return done({ id, visible });
  });
}

export async function reorderCategoriesAction(ids: string[]): Promise<ActionResult> {
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isUuid)) return fail("Ordem inválida.");

  return withAdmin(async (supabase) => {
    const { error } = await supabase.rpc("reorder_categories", { p_ids: ids });
    if (error) return fail(describeDbError(error));
    return done(null);
  });
}

export async function saveStoreSettingsAction(input: unknown): Promise<ActionResult<StoreSettings>> {
  return withAdmin(async (supabase) => {
    const parsed = parseStoreSettingsInput(input, getProductImagesPublicPrefix());
    if (!parsed.ok) return fail(parsed.error);

    const { data, error } = await supabase
      .from("store_settings")
      .update(toStoreSettingsRow(parsed.value))
      .eq("id", true)
      .select("*")
      .maybeSingle<StoreSettingsRow>();
    if (error) return fail(describeDbError(error));
    if (!data) return fail("Configuração da loja não encontrada.");
    return done(toStoreSettings(data));
  });
}
