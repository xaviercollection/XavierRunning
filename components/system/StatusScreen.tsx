import type { ReactNode } from "react";
import Link from "next/link";

type StatusScreenProps = {
  code: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function StatusScreen({ code, eyebrow, title, description, children }: StatusScreenProps) {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#050505] text-ink">
      <div aria-hidden="true" className="grain-fixed opacity-[0.04]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(199,163,90,0.10),transparent_42%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8vw] top-1/2 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <header className="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-between border-b border-white/[0.06] px-[clamp(1.25rem,4vw,3.5rem)]">
        <Link href="/" className="flex items-baseline gap-3" aria-label="Xavier Collection — início">
          <span className="font-display text-base text-gold">X</span>
          <span className="font-display text-[12px] tracking-[0.28em] text-champagne uppercase">Xavier Collection</span>
        </Link>
        <span className="text-[8px] tracking-[0.3em] text-ink-faint uppercase">Presença em cada detalhe</span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 py-32 text-center">
        <p aria-hidden="true" className="absolute font-display text-[clamp(12rem,34vw,30rem)] leading-none text-white/[0.018]">{code}</p>
        <p className="text-[9px] tracking-[0.38em] text-gold uppercase">{eyebrow}</p>
        <h1 className="mt-7 max-w-3xl font-display text-[clamp(3.25rem,8vw,7rem)] leading-[0.9] tracking-[-0.04em] text-champagne">{title}</h1>
        <p className="mt-7 max-w-xl text-sm leading-7 text-ink-muted md:text-base">{description}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">{children}</div>
        <div aria-hidden="true" className="mt-16 flex items-center gap-4 text-gold/40"><span className="h-px w-16 bg-current" /><span className="font-display text-sm">XC</span><span className="h-px w-16 bg-current" /></div>
      </section>
    </main>
  );
}
