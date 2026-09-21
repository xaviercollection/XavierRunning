import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Roda SOMENTE em /admin. Faz duas coisas:
//   1. renova a sessão do Supabase (Server Components não conseguem gravar cookies);
//   2. checagem OTIMISTA: sem sessão, manda para /admin/login.
// Isto NÃO é a barreira de segurança. A autorização real é feita no servidor
// (getAdminSession / withAdmin) e no banco (RLS + is_admin()).
export async function proxy(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, cacheHeaders) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // Respostas que gravam cookies de sessão não podem ser cacheadas por CDN/proxy reverso.
        for (const [key, value] of Object.entries(cacheHeaders)) response.headers.set(key, value);
      },
    },
  });

  // Deve vir antes de qualquer resposta: é aqui que o token expirado é renovado.
  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (!data?.claims && !isLoginPage) {
    const redirectResponse = NextResponse.redirect(new URL("/admin/login", request.url));
    for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
