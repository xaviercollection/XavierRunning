import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Cliente de servidor ligado à sessão do usuário (cookies). Crie um novo a cada requisição.
 * Toda query passa pela RLS com o JWT de quem está logado.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado a partir de um Server Component, onde cookies são somente leitura.
          // Sem problema: o proxy.ts renova a sessão em /admin antes da renderização.
        }
      },
    },
  });
}

/**
 * Cliente anônimo, SEM cookies e SEM sessão, para a loja pública. Isso garante que um
 * administrador navegando em /loja enxergue exatamente o que o cliente enxerga (sem rascunhos).
 */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createSupabaseClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
