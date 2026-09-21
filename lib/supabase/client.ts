import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Cliente do NAVEGADOR: usa somente a chave publicável. A sessão do administrador chega
// pelos cookies gravados no login (server action), então uploads ao Storage rodam com o
// JWT dele e são autorizados pelas policies de storage.objects (is_admin()).
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
