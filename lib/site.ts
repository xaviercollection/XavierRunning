const LOCAL_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value?: string): string | null {
  if (!value) return null;

  // Aceita tanto o valor puro quanto uma linha copiada de um arquivo .env.
  const trimmed = value
    .trim()
    .replace(/^NEXT_PUBLIC_SITE_URL\s*=\s*/i, "")
    .replace(/^['"]|['"]$/g, "");

  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

// Na Vercel, usa automaticamente o domínio *.vercel.app quando não há domínio
// próprio configurado. Em desenvolvimento, mantém o endereço local.
export const SITE_URL =
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  normalizeSiteUrl(process.env.VERCEL_URL) ??
  LOCAL_SITE_URL;

export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
