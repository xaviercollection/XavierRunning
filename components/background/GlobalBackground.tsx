"use client";

import { SilkBackground } from "@/components/background/SilkBackground";

/**
 * GlobalBackground — ONE persistent atmospheric layer fixed behind the entire
 * page. Everything a section "feels" as a background (the black/gold silk, the
 * champagne air, the dark edges) lives here, in a single viewport-anchored
 * canvas that never restarts between sections.
 *
 * Sections below it are transparent; they can add local lighting on top, but
 * the ENVIRONMENT is one continuous canvas from the hero to the footer.
 *
 * Layer order (top to bottom):
 *   1. dark readability ramp   — keeps white copy legible everywhere
 *   2. ambient gold lights      — a wide champagne breath, section-agnostic
 *   3. silk                     — the drifting champagne/black texture
 *   4. void base                — honest near-black, never a bright edge
 */
export function GlobalBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void"
    >
      {/* Silk — the persistent, viewport-anchored texture. */}
      <SilkBackground tone="champagne" className="absolute inset-0 h-full w-full" />

      {/* Ambient gold light — a wide champagne breath so empty areas never
          read as "unused gaps". Deliberately section-agnostic: it sits at
          fixed viewport coordinates and simply persists while scrolling. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(200,164,93,0.05) 0%, rgba(200,164,93,0.02) 45%, transparent 72%)",
        }}
      />

      {/* Readability ramp — long, soft darkening toward the bottom so text
          stays legible deep into any section without a visible band. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />

      {/* Vignette — one persistent, gentle frame over everything; sections
          inherit the same cinematic edge, so there is never a sharp cut. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 58%, rgba(3,3,3,0.4) 100%)",
        }}
      />
    </div>
  );
}