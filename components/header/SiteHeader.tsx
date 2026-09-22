"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

const NAV_LINKS = [
  { label: "Novidades", href: "#colecao-roupas" },
  { label: "Masculino", href: "#colecao-roupas" },
  { label: "Perfumes", href: "#fragrancias" },
  { label: "Contato", href: "#contato" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tickingRef = useRef(false);
  const { count: cartCount } = useCart();

  useEffect(() => {
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        setScrolled((prev) => {
          const next = window.scrollY > 96;
          return prev === next ? prev : next;
        });
        tickingRef.current = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Body scroll lock while the mobile menu is open — keeps the page still
  // behind the panel and avoids scroll-triggered jank on the open state.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close the panel the moment it navigates or the viewport crosses to desktop.
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setMenuOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-700 ${
        scrolled ? "border-b border-white/5 bg-black/45 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
      style={{ transitionTimingFunction: "var(--ease-xavier)" }}
    >
      <div
        className={`mx-auto flex w-full max-w-[1680px] items-center justify-between px-[clamp(1.25rem,4vw,3.5rem)] transition-[padding] duration-700 ${
          scrolled ? "py-3.5" : "py-5 md:py-7"
        }`}
        style={{ transitionTimingFunction: "var(--ease-xavier)" }}
      >
        <a href="#top" className="group flex items-baseline gap-3">
          <span
            aria-hidden="true"
            className="font-display text-sm leading-none text-gold md:text-base"
          >
            X
          </span>
          <span className="font-display text-[12px] md:text-[14px] tracking-[0.3em] text-champagne uppercase transition-colors duration-300 group-hover:text-gold">
            Xavier Collection
          </span>
        </a>

        <div className="flex items-center gap-6 lg:gap-9">
          <a
            href="/loja"
            aria-label={cartCount > 0 ? `Abrir a loja — sacola com ${cartCount} itens` : "Explorar a loja"}
            className="relative hidden h-9 w-9 items-center justify-center text-ink-muted transition-colors duration-300 hover:text-gold md:flex"
          >
            <BagIcon />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[8px] font-medium text-black">
                {cartCount}
              </span>
            )}
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            className="group relative flex h-8 w-8 flex-col items-end justify-center gap-[5px] md:hidden"
          >
            <span
              aria-hidden="true"
              className="h-px bg-ink transition-all duration-300"
              style={{
                width: menuOpen ? "24px" : "24px",
                transform: menuOpen ? "translateY(3px) rotate(45deg)" : "none",
              }}
            />
            <span
              aria-hidden="true"
              className="h-px bg-ink transition-all duration-300"
              style={{
                width: menuOpen ? "24px" : "18px",
                transform: menuOpen ? "translateY(-3px) rotate(-45deg)" : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* Mobile panel — editorial column, not a fit-to-screen grid */}
      <div
        id="mobile-nav-panel"
        className="overflow-hidden border-white/[0.06] bg-black/60 backdrop-blur-xl transition-[grid-template-rows] duration-500 md:hidden"
        style={{
          display: "grid",
          gridTemplateRows: menuOpen ? "1fr" : "0fr",
          borderBottomWidth: menuOpen ? "1px" : "0px",
          transitionTimingFunction: "var(--ease-xavier)",
        }}
      >
        <div className="overflow-hidden">
          <nav aria-label="Mobile" className="flex flex-col px-[clamp(1.25rem,6vw,2.5rem)] pb-10 pt-6">
            <span className="mb-6 text-[9px] tracking-[0.4em] text-ink-faint uppercase">
              Menu
            </span>
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between border-b border-white/[0.06] py-4 font-display text-2xl tracking-wide text-ink uppercase transition-colors duration-300 hover:text-gold"
              >
                {link.label}
                <span aria-hidden="true" className="text-sm text-gold/60">
                  →
                </span>
              </a>
            ))}
            <a
              href="/loja"
              onClick={() => setMenuOpen(false)}
              className="link-xc mt-8 self-start"
            >
              Explorar a loja
              <span aria-hidden="true" className="arrow">
                →
              </span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden="true"
    >
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
