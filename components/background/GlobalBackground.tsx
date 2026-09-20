"use client";

import { SilkBackground } from "@/components/background/SilkBackground";

/**
 * GlobalBackground — ONE persistent atmospheric layer fixed behind the entire
 * page. Everything a section "feels" as a background (the purple-gray silk
 * and its dark edges) lives here, in a single viewport-anchored
 * canvas that never restarts between sections.
 *
 * Sections below it are transparent; they can add local lighting on top, but
 * the ENVIRONMENT is one continuous canvas from the hero to the footer.
 *
 * Layer order (top to bottom):
 *   1. dark readability ramp   — keeps white copy legible everywhere
 *   2. silk                     — the drifting 21st purple-gray texture
 *   3. void base                — honest near-black, never a bright edge
 */
export function GlobalBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void"
    >
      {/* Silk — viewport-fixed and independent from every scroll transform. */}
      <SilkBackground tone="silk" scale={0.55} className="absolute inset-0 h-full w-full" />

      {/* Readability ramp — long, soft darkening toward the bottom so text
          stays legible deep into any section without a visible band. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55" />

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
