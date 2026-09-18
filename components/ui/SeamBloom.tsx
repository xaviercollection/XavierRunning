/**
 * SeamBloom — a slow champagne bloom that sits ON a section boundary and
 * washes over both sides, so consecutive sections read as one continuous,
 * lit atmosphere instead of stacked blocks. Mirrors the hero bloom's soft
 * radial signature, not a hard blush spot. Pure decoration: static, inert,
 * never intercepts pointer events.
 */
export function SeamBloom() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative -my-[clamp(2rem,4vw,3rem)] h-[clamp(6rem,12vw,10rem)]">
      <div
        className="absolute inset-x-0 top-1/2 h-full -translate-y-1/2"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 46% 55% at 50% 50%, rgba(203,167,96,0.34) 0%, rgba(203,167,96,0.16) 30%, rgba(203,167,96,0.06) 54%, transparent 78%)",
        }}
      />
      {/* second chamber — a slightly cooler champagne second beat so the seam
          feels alive (breathing light crossing the boundary), never flat. */}
      <div
        className="absolute inset-x-0 top-1/2 h-full -translate-y-1/2"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 30% 44% at 50% 54%, rgba(216,186,114,0.20) 0%, rgba(216,186,114,0) 70%)",
        }}
      />
    </div>
  );
}