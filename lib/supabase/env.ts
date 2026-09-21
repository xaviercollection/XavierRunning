import { assertPublishableKey } from "./key-guard";

// As duas variáveis são lidas por acesso estático (process.env.NEXT_PUBLIC_...) de propósito:
// é assim que o Next as embute no bundle do navegador. Não use process.env[nome].

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase não configurado. Copie .env.example para .env.local e preencha " +
        "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  assertPublishableKey(publishableKey);
  return { url: url.replace(/\/+$/, ""), publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

/** Prefixo das URLs públicas do bucket product-images (único host remoto aceito nas imagens). */
export function getProductImagesPublicPrefix(): string {
  return `${getSupabaseEnv().url}/storage/v1/object/public/product-images/`;
}

/**
 * Mesma coisa, mas NUNCA lança: devolve "" se a URL não estiver configurada. Use em componentes de
 * cliente (só para decidir o que mostrar no preview) para que uma configuração ausente não derrube a
 * tela. "" significa "nenhum host remoto é aceito" (as funções de validação exigem prefixo não-vazio).
 */
export function getProductImagesPublicPrefixSafe(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url ? `${url.replace(/\/+$/, "")}/storage/v1/object/public/product-images/` : "";
}
