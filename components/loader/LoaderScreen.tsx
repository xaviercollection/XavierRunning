"use client";

interface LoaderScreenProps {
  progress: number;
  ready: boolean;
  onDone: () => void;
}

export function LoaderScreen({ progress, ready, onDone }: LoaderScreenProps) {
  const pct = Math.round(Math.min(100, Math.max(0, progress)));

  return (
    <div
      aria-hidden={ready}
      onTransitionEnd={(event) => {
        if (ready && event.propertyName === "opacity") onDone();
      }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-void transition-opacity duration-700"
      style={{
        opacity: ready ? 0 : 1,
        pointerEvents: ready ? "none" : "auto",
        transitionTimingFunction: "var(--ease-xavier)",
      }}
    >
      <p className="eyebrow mb-7">Collection · 2026</p>
      <span className="font-display text-2xl tracking-[0.5em] text-champagne uppercase md:text-3xl">
        Xavier
      </span>

      <div className="mt-8 h-px w-40 overflow-hidden bg-white/10 md:w-56">
        <div
          className="h-full bg-gold-bright transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className="mt-4 text-[11px] tracking-[0.3em] text-ink-faint tabular-nums">
        {pct.toString().padStart(3, "0")}
      </span>
    </div>
  );
}
