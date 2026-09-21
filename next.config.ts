import type { NextConfig } from "next";
import path from "node:path";
import { assertPublishableKey } from "./lib/supabase/key-guard";

// Falha o build/dev se uma chave SECRETA estiver numa variável NEXT_PUBLIC_* (seria publicada no bundle).
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if (publishableKey) assertPublishableKey(publishableKey);

// Imagens enviadas pelo painel ficam no bucket público product-images. Só esse caminho é
// autorizado no next/image (sem query string: a v16 exige `search` explícito).
function supabaseHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const storageHostname = supabaseHostname();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: storageHostname
      ? [
          {
            protocol: "https",
            hostname: storageHostname,
            pathname: "/storage/v1/object/public/product-images/**",
            search: "",
          },
        ]
      : [],
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
