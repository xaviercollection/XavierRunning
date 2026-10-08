import type { NextConfig } from "next";
import path from "node:path";
import { invalidLinks, LINKS } from "./config/site";

// Confere os links da bio a cada build/dev: link fora do formato derruba o build,
// para nunca ir ao ar um botão quebrado.
const invalid = invalidLinks();
if (invalid.length > 0) {
  throw new Error(
    `[bio] Link fora do formato em config/site.ts: ${invalid.join(", ")}. Siga o formato comentado acima de cada link.`,
  );
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
