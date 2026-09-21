import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminSession =
  | { status: "anonymous" }
  | { status: "not-admin"; email: string }
  | { status: "admin"; email: string; userId: string };

/**
 * Verificação AUTORITATIVA: valida o token no servidor do Auth (getUser) e consulta
 * public.is_admin() com o JWT do usuário. O proxy.ts faz apenas uma checagem otimista.
 */
export async function getAdminSession(): Promise<AdminSession> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "anonymous" };

  const email = data.user.email ?? "";
  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError || isAdmin !== true) return { status: "not-admin", email };

  return { status: "admin", email, userId: data.user.id };
}
