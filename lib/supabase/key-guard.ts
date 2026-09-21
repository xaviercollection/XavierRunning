// Barreira contra o erro mais grave desta integração: colocar uma chave SECRETA
// (service_role / sb_secret_*) numa variável NEXT_PUBLIC_*, que o Next embute no
// JavaScript enviado ao navegador. Só a chave publicável pode chegar aqui.

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const parsed: unknown = JSON.parse(atob(padded));
    return parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function assertPublishableKey(
  key: string,
  variableName = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
): void {
  const value = key.trim();
  const secret =
    value.startsWith("sb_secret_") || decodeJwtPayload(value)?.role === "service_role";

  if (secret) {
    throw new Error(
      `${variableName} contém uma chave SECRETA (service_role / sb_secret_...). ` +
        "Ela seria publicada no navegador. Use a chave publicável (sb_publishable_... ou anon) " +
        "e mantenha chaves secretas apenas em variáveis de servidor sem o prefixo NEXT_PUBLIC_.",
    );
  }
}
