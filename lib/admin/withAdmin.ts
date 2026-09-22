import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Extraído de lib/store/admin-actions.ts para ser reaproveitado por outros domínios de Server
// Actions (ex.: lib/finance/actions.ts) sem duplicar a checagem de admin. Não pode viver num
// arquivo "use server": toda exportação de um arquivo desses precisa ser Server Action chamável
// pelo cliente, e `withAdmin` recebe uma função como argumento (não é serializável).

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export const fail = (error: string): ActionResult<never> => ({ ok: false, error });
export const done = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export interface DbError {
  code?: string;
  message: string;
}

/**
 * Porta única de entrada de toda action administrativa: exige sessão válida + is_admin() e
 * captura QUALQUER exceção (rede, Supabase fora do ar, env ausente) devolvendo { ok:false } em
 * vez de lançar — assim o painel nunca fica preso em "Salvando…". A validação de entrada roda
 * dentro de `run`, então quem não é admin não recebe nem mensagens de validação.
 */
export async function withAdmin<T>(
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
    console.error("[admin] falha inesperada:", error);
    return fail("Não foi possível concluir a operação. Tente novamente.");
  }
}
