// Configuração central da bio (xaviercollection.com.br): todo texto e todo link da página saem daqui.
// Para ativar WhatsApp, Instagram e localização, troque SÓ as três URLs com "SUBSTITUIR" em LINKS.
// Sem imports de propósito: este arquivo também é lido pelo next.config.ts e pelos testes no Node.

/** Marcador dos links ainda não definidos. Enquanto algum link contiver isto, o build avisa no log. */
export const PLACEHOLDER = "SUBSTITUIR";

export const SITE_URL = "https://xaviercollection.com.br";

export const COPY = {
  brand: "Xavier Collection",
  slogan: "Vista sua presença.",
  support: "Moda masculina, perfumaria e lifestyle.",
  footer: "Curated in Brazil · XC 2026",
} as const;

export const LINKS = {
  /** Loja online. Não mudar: é o domínio atual da loja. */
  store: "https://loja.xaviercollection.com.br/",
  /** Formato: https://wa.me/5583999999999 (55 + DDD + número, só dígitos). */
  whatsapp: "https://wa.me/SUBSTITUIR_NUMERO_WHATSAPP",
  /** Formato: https://www.instagram.com/perfil/ */
  instagram: "https://www.instagram.com/SUBSTITUIR_PERFIL_INSTAGRAM/",
  /** Formato: link "Compartilhar" do Google Maps (https://maps.app.goo.gl/...) ou https://www.google.com/maps/... */
  location: "https://www.google.com/maps/search/?api=1&query=SUBSTITUIR_ENDERECO_DA_LOJA",
} as const;

export type LinkId = keyof typeof LINKS;

export interface BioAction {
  id: LinkId;
  label: string;
  href: string;
  /** Destinos fora dos domínios Xavier abrem em nova aba. */
  external: boolean;
}

/** Os quatro botões, na ordem em que aparecem. */
export const ACTIONS: readonly BioAction[] = [
  { id: "store", label: "Explorar a loja", href: LINKS.store, external: false },
  { id: "whatsapp", label: "WhatsApp", href: LINKS.whatsapp, external: true },
  { id: "instagram", label: "Instagram", href: LINKS.instagram, external: true },
  { id: "location", label: "Visitar a loja", href: LINKS.location, external: true },
];

const LINK_FORMATS: Record<LinkId, RegExp> = {
  store: /^https:\/\/loja\.xaviercollection\.com\.br\/$/,
  whatsapp: /^https:\/\/wa\.me\/\d{12,15}(\?.*)?$/,
  instagram: /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/,
  location:
    /^https:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/|(www\.)?google\.com(\.br)?\/maps[/?]|maps\.google\.com(\.br)?\/)/,
};

export function isPlaceholder(href: string): boolean {
  return href.includes(PLACEHOLDER);
}

/**
 * Confere os links antes do build. `pending` são os que ainda têm placeholder (só aviso);
 * `invalid` são os que foram trocados por algo fora do formato esperado (o build falha).
 */
export function auditLinks(links: Record<LinkId, string> = LINKS): { pending: LinkId[]; invalid: LinkId[] } {
  const pending: LinkId[] = [];
  const invalid: LinkId[] = [];
  for (const id of Object.keys(LINK_FORMATS) as LinkId[]) {
    const href = links[id];
    if (isPlaceholder(href)) pending.push(id);
    else if (!LINK_FORMATS[id].test(href)) invalid.push(id);
  }
  return { pending, invalid };
}
