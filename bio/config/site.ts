// Configuração central da bio (xaviercollection.com.br): todo texto e todo link da página saem daqui.
// Para trocar um destino, edite só LINKS; o build confere o formato de cada link antes de publicar.
// Sem imports de propósito: este arquivo também é lido pelo next.config.ts e pelos testes no Node.

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
  /** +55 (83) 8893-3979. Formato: https://wa.me/ + 55 + DDD + número, só dígitos. */
  whatsapp: "https://wa.me/558388933979",
  /** Formato: https://www.instagram.com/perfil/ */
  instagram: "https://www.instagram.com/xaviercollection2/",
  /** Rua Sólon de Lucena, 26 — Arara. Formato: link do Google Maps (maps.google.com, google.com/maps ou maps.app.goo.gl). */
  location: "https://maps.google.com/?q=Rua+Solon+de+Lucena+26+Arara",
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

/** Links fora do formato esperado. O next.config.ts derruba o build se a lista não vier vazia. */
export function invalidLinks(links: Record<LinkId, string> = LINKS): LinkId[] {
  return (Object.keys(LINK_FORMATS) as LinkId[]).filter((id) => !LINK_FORMATS[id].test(links[id]));
}
