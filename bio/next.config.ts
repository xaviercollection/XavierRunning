import type { NextConfig } from "next";
import path from "node:path";
import { auditLinks, LINKS } from "./config/site";

// Confere os links da bio a cada build/dev: placeholder só gera aviso no log (a página publica normalmente);
// link trocado fora do formato derruba o build, para nunca ir ao ar um botão quebrado.
const { pending, invalid } = auditLinks();
if (invalid.length > 0) {
  throw new Error(
    `[bio] Link fora do formato em config/site.ts: ${invalid.join(", ")}. Siga o formato comentado acima de cada link.`,
  );
}
if (pending.length > 0) {
  console.warn(`[bio] Links ainda com placeholder em config/site.ts: ${pending.join(", ")}.`);
}

// Antigos endereços da loja no domínio principal continuam funcionando: seguem para o subdomínio da loja.
const storeOrigin = new URL(LINKS.store).origin;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      { source: "/loja", destination: `${storeOrigin}/loja`, permanent: true },
      { source: "/admin/:path*", destination: `${storeOrigin}/admin/:path*`, permanent: true },
    ];
  },
};

export default nextConfig;
