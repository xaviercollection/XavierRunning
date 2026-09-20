const EXPLORE_LINKS = [
  { label: "Novidades", href: "#colecao-roupas" },
  { label: "Masculino", href: "#colecao-roupas" },
  { label: "Perfumes", href: "#fragrancias" },
];

const CONTACT_SLOTS = [
  { label: "Instagram" },
  { label: "WhatsApp" },
  { label: "Localização" },
];

export function SiteFooter() {
  return (
    <footer id="contato" className="relative overflow-hidden border-t border-white/5">
      {/* Oversized back-of-book wordmark */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-4 select-none text-center font-display text-[24vw] leading-none text-white/[0.025]"
      >
        Xavier
      </span>

      <div className="relative z-10 xc-container xc-section">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <a href="#top" className="font-display text-2xl tracking-[0.1em] text-ink uppercase">
              Xavier Collection
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Fragrâncias, moda e lifestyle. Presença que se sente antes de se ver.
            </p>
            <p className="mt-6 text-[10px] tracking-[0.35em] text-ink-faint uppercase">
              XC · Curated in Brazil
            </p>
          </div>

          <nav aria-label="Rodapé" className="flex flex-col gap-3 md:col-span-3">
            <span className="mb-1 text-[9px] tracking-[0.4em] text-ink-faint uppercase">
              Explore
            </span>
            {EXPLORE_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 md:col-span-4">
            <span className="mb-1 text-[9px] tracking-[0.4em] text-ink-faint uppercase">
              Contato
            </span>
            {CONTACT_SLOTS.map((slot) => (
              <div key={slot.label} className="flex items-center justify-between gap-8 border-b border-white/5 py-2">
                <span className="text-[11px] tracking-[0.3em] text-ink-muted uppercase">
                  {slot.label}
                </span>
                <span className="text-[10px] tracking-wide text-ink-faint">Em breve</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col-reverse items-center justify-between gap-5 border-t border-white/5 pt-8 text-[10px] tracking-[0.2em] text-ink-faint uppercase md:flex-row">
          <span>© {new Date().getFullYear()} Xavier Collection · Street luxury</span>
          <span className="text-gold/70">Collection 2026</span>
        </div>
      </div>
    </footer>
  );
}
