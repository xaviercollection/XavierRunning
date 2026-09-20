"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimeSplitTitle } from "@/components/ui/AnimeSplitTitle";
import type { ClothingItem } from "@/lib/clothingCatalog";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface ClothingCarouselProps {
  items: ClothingItem[];
  id?: string;
}

const AUTOPLAY_INTERVAL = 5600;
const AUTOPLAY_RESUME_DELAY = 5000;
const SWIPE_THRESHOLD = 44;

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total;
}

function getCircularPosition(index: number, activeIndex: number, total: number) {
  let position = index - activeIndex;
  if (position > total / 2) position -= total;
  if (position < -total / 2) position += total;
  return position;
}

export function ClothingCarousel({ items, id }: ClothingCarouselProps) {
  const reducedMotion = useReducedMotion();
  const total = items.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [inViewport, setInViewport] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const touchRef = useRef<{ x: number; y: number; intent: "horizontal" | "vertical" | null } | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pauseAutoplay = useCallback(() => {
    setInteractionPaused(true);
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setInteractionPaused(false), AUTOPLAY_RESUME_DELAY);
  }, []);

  const moveTo = useCallback(
    (nextIndex: number) => {
      if (!total) return;
      pauseAutoplay();
      setActiveIndex(wrapIndex(nextIndex, total));
    },
    [pauseAutoplay, total],
  );

  const goPrev = useCallback(() => moveTo(activeIndex - 1), [activeIndex, moveTo]);
  const goNext = useCallback(() => moveTo(activeIndex + 1), [activeIndex, moveTo]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !inViewport || hoverPaused || interactionPaused || total <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => wrapIndex(index + 1, total));
    }, AUTOPLAY_INTERVAL);

    return () => window.clearInterval(timer);
  }, [hoverPaused, inViewport, interactionPaused, reducedMotion, total]);

  useEffect(() => () => clearTimeout(resumeTimerRef.current), []);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY, intent: null };
    pauseAutoplay();
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (start.intent === null && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      start.intent = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || start.intent !== "horizontal") return;

    const deltaX = event.changedTouches[0].clientX - start.x;
    if (deltaX <= -SWIPE_THRESHOLD) goNext();
    if (deltaX >= SWIPE_THRESHOLD) goPrev();
  };

  if (!total) return null;

  const activeItem = items[activeIndex];
  const progress = ((activeIndex + 1) / total) * 100;

  return (
    <section
      id={id}
      ref={sectionRef}
      aria-label="Coleção de Roupas Xavier Collection"
      className="xc-section relative overflow-hidden"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") goPrev();
        if (event.key === "ArrowRight") goNext();
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {items.map((item, index) => (
          <div
            key={item.slug}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: index === activeIndex ? 0.15 : 0 }}
          >
            <Image
              src={item.imageSrc}
              alt=""
              fill
              sizes="100vw"
              className="scale-125 object-cover"
              style={{
                filter: "blur(72px) brightness(0.22) saturate(0.5) sepia(0.28)",
                objectPosition: `${(item.focalPoint?.x ?? 0.5) * 100}% ${(item.focalPoint?.y ?? 0.5) * 100}%`,
              }}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,rgba(3,3,3,0.18)_42%,rgba(3,3,3,0.72)_100%)]" />
      </div>

      <div className="xc-container relative z-10">
        <div className="mb-8 text-center md:mb-10">
          <p className="eyebrow">Coleção · Selected Goods</p>
          <AnimeSplitTitle
            lines={["Vista sua identidade."]}
            className="mx-auto mt-5 max-w-4xl font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.9] text-ink text-balance"
          />
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-muted text-balance">
            Strike, Crosby e Zara — peças escolhidas para construir presença de todos os ângulos.
          </p>
        </div>

        <div
          className="relative mx-[calc(50%-50vw)] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
        >
          <div
            className="relative h-[clamp(25rem,58vw,41rem)] w-full [perspective:1500px]"
            style={{ touchAction: "pan-y pinch-zoom" }}
          >
            {items.map((item, index) => {
              const position = getCircularPosition(index, activeIndex, total);
              const distance = Math.abs(position);
              const isActive = position === 0;
              const isVisible = distance <= 1;
              const xOffset = position * 76;

              return (
                <button
                  key={item.slug}
                  type="button"
                  aria-label={isActive ? `${item.name}, peça selecionada` : `Selecionar ${item.name}`}
                  aria-hidden={!isVisible}
                  tabIndex={isVisible ? 0 : -1}
                  onClick={() => moveTo(index)}
                  className="group absolute left-1/2 top-[2%] aspect-[4/5] w-[clamp(16rem,36vw,29rem)] overflow-hidden rounded-[3px] border bg-[#070605] text-left [transform-style:preserve-3d] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                  style={{
                    opacity: isVisible ? (isActive ? 1 : 0.48) : 0,
                    pointerEvents: isVisible ? "auto" : "none",
                    zIndex: isActive ? 20 : 10,
                    borderColor: isActive ? "rgba(199,163,90,0.5)" : "rgba(255,255,255,0.08)",
                    boxShadow: isActive
                      ? "0 42px 95px -36px rgba(0,0,0,0.98), 0 0 70px -40px rgba(199,163,90,0.65)"
                      : "0 26px 70px -34px rgba(0,0,0,0.95)",
                    transform: `translate3d(calc(-50% + ${xOffset}%), ${distance * 4}%, ${distance * -170}px) rotateY(${position * -18}deg) scale(${isActive ? 1 : 0.8})`,
                    transition: reducedMotion
                      ? "none"
                      : "transform 850ms cubic-bezier(0.16,1,0.3,1), opacity 650ms ease, filter 650ms ease, border-color 650ms ease, box-shadow 650ms ease",
                    filter: isActive ? "brightness(1) saturate(1)" : "brightness(0.48) saturate(0.72)",
                  }}
                >
                  <Image
                    src={item.imageSrc}
                    alt={`${item.name} — ${item.brand}`}
                    fill
                    sizes="(min-width: 1024px) 29rem, 72vw"
                    priority={index < 3}
                    className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.025]"
                    style={{
                      objectPosition: `${(item.focalPoint?.x ?? 0.5) * 100}% ${(item.focalPoint?.y ?? 0.5) * 100}%`,
                    }}
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/15" />
                  <span
                    className="absolute left-5 top-5 text-[9px] tracking-[0.32em] uppercase"
                    style={{ color: isActive ? "var(--color-gold)" : "var(--color-ink-faint)" }}
                  >
                    {String(index + 1).padStart(2, "0")} · {item.brand}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative z-30 mx-auto -mt-[clamp(2rem,5vw,4rem)] grid max-w-4xl grid-cols-[3rem_1fr_3rem] items-center gap-4 px-4 md:grid-cols-[4rem_1fr_4rem] md:gap-8">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Peça anterior"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/35 text-ink transition-all duration-300 hover:border-gold/70 hover:text-gold md:h-14 md:w-14"
            >
              <ArrowIcon direction="left" />
            </button>

            <div
              key={activeItem.slug}
              className="min-w-0 text-center"
              style={{ animation: reducedMotion ? undefined : "clothing-copy-in 650ms cubic-bezier(0.16,1,0.3,1) both" }}
            >
              <h3 className="font-display text-[clamp(1.9rem,4.8vw,3.8rem)] leading-none text-ink">
                {activeItem.brand}
              </h3>
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label="Próxima peça"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/35 text-ink transition-all duration-300 hover:border-gold/70 hover:text-gold md:h-14 md:w-14"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>

          <div className="mx-auto mt-8 flex max-w-xl items-center gap-5 px-6">
            <span className="font-display text-xs tabular-nums text-gold">
              {String(activeIndex + 1).padStart(2, "0")}
            </span>
            <div className="relative h-px flex-1 overflow-hidden bg-white/10">
              <div
                className="absolute inset-y-0 left-0 bg-gold"
                style={{
                  width: `${progress}%`,
                  transition: reducedMotion ? "none" : "width 700ms cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
            <span className="font-display text-xs tabular-nums text-ink-faint">
              {String(total).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes clothing-copy-in {
          from {
            opacity: 0;
            transform: translateY(14px);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={17}
      height={17}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden="true"
    >
      {direction === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}
