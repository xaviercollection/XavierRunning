"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { getPosterSrc } from "@/lib/media";
import type { CarouselPerfume } from "@/lib/perfumeCatalog";
import { FrameSequencePlayer } from "@/components/media/FrameSequencePlayer";
import { SplitTitle } from "@/components/ui/SplitTitle";

interface PerfumeCoverflowCarouselProps {
  perfumes: CarouselPerfume[];
  id?: string;
}

/** Shortest circular distance from `index` to `active` among `total` slots —
 * works identically whether there are 2 items or 20; with 2 it never
 * produces the same side for both neighbors. */
function circularDiff(index: number, active: number, total: number): number {
  let diff = index - active;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

type BoxKind = "active" | "lateral" | "far";

interface SlideStyle {
  rotateY: number;
  scale: number;
  translateZ: number;
  brightness: number;
  opacity: number;
  z: number;
  gap: number; // multiplier applied to --slot-gap
  boxKind: BoxKind;
}

/** The "physical card" choreography: every property here is a pure function
 * of circular distance from the active slot, so opening (0 -> becoming
 * active) and closing (becoming active -> away) are just the same CSS
 * transition running in opposite directions — no separate enter/exit code
 * paths needed. */
function getSlideStyle(diff: number): SlideStyle {
  const abs = Math.abs(diff);
  const sign = Math.sign(diff);

  if (abs === 0) {
    return { rotateY: 0, scale: 1, translateZ: 0, brightness: 1, opacity: 1, z: 30, gap: 0, boxKind: "active" };
  }
  if (abs === 1) {
    return { rotateY: sign * -24, scale: 0.92, translateZ: -90, brightness: 0.6, opacity: 1, z: 20, gap: sign, boxKind: "lateral" };
  }
  const extra = Math.min(abs - 1, 2);
  return {
    rotateY: sign * -32,
    scale: Math.max(0.8, 0.92 - extra * 0.1),
    translateZ: -90 - extra * 60,
    brightness: Math.max(0.28, 0.6 - extra * 0.16),
    opacity: abs > 2 ? 0 : 0.55,
    z: 20 - extra,
    gap: sign * (1 + extra * 0.5),
    boxKind: "far",
  };
}

const SWIPE_THRESHOLD = 42;
const DRAG_FOLLOW_RATIO = 0.3;
const DRAG_FOLLOW_MAX = 70;
const AUTOPLAY_INTERVAL = 8000;
const AUTOPLAY_RESUME_DELAY = 5000;
const PRELOAD_WINDOW = 1;

export function PerfumeCoverflowCarousel({ perfumes, id }: PerfumeCoverflowCarouselProps) {
  const reducedMotion = useReducedMotion();
  const total = perfumes.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [inViewport, setInViewport] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const touchRef = useRef<{ x: number; y: number; intent: "horizontal" | "vertical" | null } | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pauseAutoplay = () => {
    setInteractionPaused(true);
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setInteractionPaused(false), AUTOPLAY_RESUME_DELAY);
  };

  const goTo = (index: number) => {
    pauseAutoplay();
    setActiveIndex(((index % total) + total) % total);
  };
  const goNext = () => goTo(activeIndex + 1);
  const goPrev = () => goTo(activeIndex - 1);

  // Pause all playback the moment the carousel scrolls out of view.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Pause the active video when the tab is backgrounded; resumes only if
  // the card is still active and the carousel is still in view (both are
  // re-checked naturally since playbackAllowed recombines all three).
  useEffect(() => {
    const handleVisibility = () => setDocumentVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Keyboard: only steals arrow keys while the carousel is actually on screen.
  useEffect(() => {
    if (!inViewport) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inViewport, activeIndex, total]);

  // Autoplay: gentle rotation through the catalog, paused by any user
  // interaction (click, swipe, hover, keyboard) and resumed a few seconds
  // after things go quiet again. Off entirely under reduced motion.
  useEffect(() => {
    if (reducedMotion || !inViewport || hoverPaused || interactionPaused || total <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % total);
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [reducedMotion, inViewport, hoverPaused, interactionPaused, total]);

  useEffect(() => () => clearTimeout(resumeTimerRef.current), []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, intent: null };
    pauseAutoplay();
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (start.intent === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      start.intent = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (start.intent === "horizontal" && !reducedMotion && stageRef.current) {
      const follow = Math.max(-DRAG_FOLLOW_MAX, Math.min(DRAG_FOLLOW_MAX, dx * DRAG_FOLLOW_RATIO));
      stageRef.current.style.setProperty("--drag-x", `${follow}px`);
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    stageRef.current?.style.setProperty("--drag-x", "0px");
    if (!start || start.intent !== "horizontal") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    if (dx <= -SWIPE_THRESHOLD) goNext();
    else if (dx >= SWIPE_THRESHOLD) goPrev();
  };

  const ambiencePosters = useMemo(() => perfumes.map((p) => getPosterSrc(p.media)), [perfumes]);

  return (
    <section
      id={id}
      ref={sectionRef}
      aria-label="Fragrâncias Xavier Collection"
      className="relative overflow-hidden pb-[clamp(4rem,8vw,7rem)] pt-[clamp(4rem,8vw,7rem)]"
    >
      {/* Ambience: a blurred, darkened poster of the active perfume — never
          the animated frames themselves, so this never repaints per-frame.
          Desaturated and warm-tinted so it stays inside the champagne silk
          palette (gold family + near-black) and never introduces a third,
          product-colored hue; the section should read as perfume-into-fashion,
          not a new color stop. */}
      <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.22 }}>
        {perfumes.map((perfume, i) => {
          const diff = circularDiff(i, activeIndex, total);
          const withinWindow = Math.abs(diff) <= PRELOAD_WINDOW;
          return (
            <div
              key={perfume.slug}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: i === activeIndex ? 1 : 0 }}
            >
              {withinWindow && (
                <Image
                  src={ambiencePosters[i]}
                  alt=""
                  fill
                  sizes="100vw"
                  className="scale-[1.15] object-cover"
                  style={{ filter: "blur(42px) brightness(0.24) saturate(0.42) sepia(0.35)" }}
                  priority={i === activeIndex}
                />
              )}
            </div>
          );
        })}
        {/* A faint center breathing — not a covering vignette. It stays well
            under the global background's own vignette so this section reads as
            a local lighting change, never a new background box. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_55%,rgba(10,8,4,0.28)_85%,transparent_100%)]" />
        {/* Long soft dissolves to the persistent atmosphere — wide, gradual,
            never a hard band at the section edge. */}
        <div className="absolute inset-x-0 top-0 h-[clamp(8rem,20vh,16rem)] bg-gradient-to-b from-[#040302]/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[clamp(8rem,20vh,16rem)] bg-gradient-to-t from-[#040302]/50 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="eyebrow">Perfumaria · Xavier Select</p>
        <SplitTitle
          variant="converge"
          text="Fragrâncias que deixam presença."
          className="mt-6 font-display text-[clamp(2.5rem,7.5vw,6.5rem)] leading-[0.92] text-ink text-balance"
        />
        <p className="mt-5 text-sm text-ink-muted md:text-base">
          Uma presença que chega antes das palavras.
        </p>
      </div>

      <div
        ref={stageRef}
        className="relative z-10 mt-10 flex select-none items-center justify-center md:mt-12"
        style={
          {
            perspective: "1400px",
            touchAction: "pan-y",
            "--card-ratio": "5 / 7",
            "--active-w": "clamp(200px, 58vw, 264px)",
            "--lateral-w": "clamp(150px, 40vw, 200px)",
            "--far-w": "clamp(128px, 32vw, 168px)",
            "--slot-gap": "clamp(72px, 22vw, 132px)",
          } as CSSProperties
        }
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
      >
        <button
          type="button"
          onClick={goPrev}
          aria-label="Fragrância anterior"
          className="absolute left-2 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-ink transition-colors duration-300 hover:border-gold hover:text-gold md:left-5 md:h-10 md:w-10"
        >
          <ArrowIcon direction="left" />
        </button>

        <div
          className="relative"
          style={{ transformStyle: "preserve-3d", width: "var(--active-w)", aspectRatio: "var(--card-ratio)" }}
        >
          {perfumes.map((perfume, i) => {
            const diff = circularDiff(i, activeIndex, total);
            if (Math.abs(diff) > 2) return null;
            const style = getSlideStyle(diff);
            const isActive = diff === 0;
            const rotateY = reducedMotion ? 0 : style.rotateY;
            const sign = Math.sign(diff);

            return (
              <div
                key={perfume.slug}
                className="absolute top-1/2 left-1/2 transition-[width,transform,filter,opacity] ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  width: `var(--${style.boxKind}-w)`,
                  aspectRatio: "var(--card-ratio)",
                  transitionDuration: reducedMotion ? "200ms" : "760ms",
                  transform: `translate(-50%, -50%) translateX(calc(var(--slot-gap) * ${style.gap})) translateX(var(--drag-x, 0px)) translateZ(${style.translateZ}px) rotateY(${rotateY}deg) scale(${style.scale})`,
                  filter: `brightness(${style.brightness})`,
                  opacity: style.opacity,
                  zIndex: style.z,
                  cursor: isActive ? "default" : "pointer",
                  pointerEvents: style.opacity < 0.05 ? "none" : "auto",
                }}
                onClick={isActive ? undefined : () => goTo(i)}
                role={isActive ? undefined : "button"}
                aria-label={isActive ? undefined : `Ver ${perfume.name}`}
                tabIndex={isActive ? -1 : 0}
                onKeyDown={
                  isActive
                    ? undefined
                    : (e) => {
                      if (e.key === "Enter" || e.key === " ") goTo(i);
                    }
                }
              >
                <CarouselCard
                  perfume={perfume}
                  isActive={isActive}
                  sign={sign}
                  playbackAllowed={isActive && inViewport && documentVisible}
                  reducedMotion={reducedMotion}
                  preload={Math.abs(diff) <= PRELOAD_WINDOW}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goNext}
          aria-label="Próxima fragrância"
          className="absolute right-2 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-ink transition-colors duration-300 hover:border-gold hover:text-gold md:right-5 md:h-10 md:w-10"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>

      <div className="relative z-10 mt-8 flex items-center justify-center gap-3">
        {perfumes.map((perfume, i) => (
          <button
            key={perfume.slug}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ir para ${perfume.name}`}
            aria-current={i === activeIndex}
            className="group flex items-center gap-3"
          >
            <span
              className="font-display text-xs tracking-[0.15em] tabular-nums transition-colors duration-300"
              style={{ color: i === activeIndex ? "var(--color-gold)" : "var(--color-ink-faint)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {i < total - 1 && <span className="h-px w-6 bg-white/15" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      {direction === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

interface CarouselCardProps {
  perfume: CarouselPerfume;
  isActive: boolean;
  sign: number;
  playbackAllowed: boolean;
  reducedMotion: boolean;
  preload: boolean;
}

function CarouselCard({ perfume, isActive, sign, playbackAllowed, reducedMotion, preload }: CarouselCardProps) {
  const kenBurnsRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // CK Be (and any other static-image perfume): an extremely slow breathing
  // zoom while its card is the active one — never on side cards.
  useEffect(() => {
    if (perfume.media.type !== "image" || !kenBurnsRef.current) return;
    if (!playbackAllowed) {
      gsap.set(kenBurnsRef.current, { scale: 1, x: 0, y: 0 });
      return;
    }
    const tl = gsap.to(kenBurnsRef.current, {
      scale: 1.04,
      x: "+=1%",
      y: "-=1%",
      duration: 8,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tl.kill();
    };
  }, [perfume.media.type, playbackAllowed]);

  // Video perfumes: the <video> only ever mounts while this exact card is
  // the active, in-viewport, motion-allowed one (see the render branch
  // below) — so "becoming active" and "this effect running after mount"
  // are the same moment. Leaving means the element unmounts entirely,
  // which stops decoding and drops back to the poster with zero risk of a
  // stale frame lingering. That also guarantees only one <video> in the
  // whole carousel ever exists at a time.
  useEffect(() => {
    if (perfume.media.type !== "video" || !playbackAllowed) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay can be legitimately rejected (e.g. the card changed
        // again before the browser committed to playing) — inert, no UI
        // impact, and must never surface as a console error.
      });
    }
  }, [perfume.media.type, playbackAllowed]);

  const parallaxStyle: CSSProperties = reducedMotion
    ? {}
    : {
      transform: `translateX(${isActive ? 0 : sign * -14}px) scale(${isActive ? 1 : 1.045})`,
      opacity: isActive ? 1 : 0.78,
      transition: "transform 760ms cubic-bezier(0.16,1,0.3,1), opacity 760ms cubic-bezier(0.16,1,0.3,1)",
    };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[3px] border border-white/10 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)]">
      {perfume.media.type === "sequence" ? (
        <FrameSequencePlayer
          basePath={perfume.media.basePath}
          frameCount={perfume.media.frameCount}
          fps={perfume.media.fps}
          posterFrame={perfume.media.posterFrame}
          focalPoint={perfume.media.focalPoint}
          mobileFocalPoint={perfume.media.mobileFocalPoint}
          playing={playbackAllowed}
        />
      ) : perfume.media.type === "video" ? (
        <div className="absolute inset-0" style={parallaxStyle}>
          {playbackAllowed ? (
            <video
              ref={videoRef}
              src={perfume.media.src}
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: `${(perfume.media.focalPoint?.x ?? 0.5) * 100}% ${(perfume.media.focalPoint?.y ?? 0.5) * 100}%`,
              }}
              muted
              playsInline
              loop
              preload="auto"
              poster={perfume.media.poster}
            />
          ) : (
            preload && (
              <Image
                src={perfume.media.poster}
                alt={`${perfume.name} — ${perfume.brand}`}
                fill
                sizes="(min-width: 768px) 34vw, 84vw"
                className="object-cover"
                priority={isActive}
                style={{
                  objectPosition: `${(perfume.media.focalPoint?.x ?? 0.5) * 100}% ${(perfume.media.focalPoint?.y ?? 0.5) * 100}%`,
                }}
              />
            )
          )}
        </div>
      ) : (
        <div className="absolute inset-0" style={parallaxStyle}>
          <div ref={kenBurnsRef} className="absolute inset-[-3%]">
            {preload && (
              <Image
                src={perfume.media.src}
                alt={`${perfume.name} — ${perfume.brand}`}
                fill
                sizes="(min-width: 768px) 34vw, 84vw"
                className="object-cover"
                priority={isActive}
                style={{
                  objectPosition: `${(perfume.media.focalPoint?.x ?? 0.5) * 100}% ${(perfume.media.focalPoint?.y ?? 0.5) * 100}%`,
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Legibility scrim — only at the bottom, product stays the protagonist. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

      <div
        className="pointer-events-none absolute inset-x-0 top-4 z-10 px-4 text-center md:text-left md:px-5"
        style={revealStyle(isActive, 0, reducedMotion)}
      >
        <p className="text-[10px] tracking-[0.35em] text-ink-muted uppercase">{perfume.brand}</p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1.5 px-4 pb-5 text-center md:items-start md:px-5 md:pb-6 md:text-left">
        <h3
          className="font-display text-xl leading-[0.95] text-ink md:text-2xl"
          style={revealStyle(isActive, 1, reducedMotion)}
        >
          {perfume.nameLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h3>
        {perfume.tagline && (
          <p className="max-w-[200px] text-[11px] text-ink-muted md:text-xs" style={revealStyle(isActive, 2, reducedMotion)}>
            {perfume.tagline}
          </p>
        )}
        {perfume.price && (
          <span
            className="mt-0.5 font-display text-sm text-gold md:text-base"
            style={revealStyle(isActive, 3, reducedMotion)}
          >
            {perfume.price}
          </span>
        )}
        {perfume.cta && (
          <a
            href="#vitrine"
            className="pointer-events-auto mt-0.5 flex items-center gap-2 text-[10px] tracking-[0.22em] text-ink uppercase transition-colors duration-300 hover:text-gold"
            style={revealStyle(isActive, 4, reducedMotion)}
          >
            {perfume.cta}
            <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </div>
  );
}

/** Staggered brand -> name -> tagline -> CTA reveal on open (60-90ms steps),
 * fast uniform fade on close so text disappears well before the card frame
 * finishes contracting. */
function revealStyle(isActive: boolean, order: number, reducedMotion: boolean): CSSProperties {
  if (reducedMotion) {
    return { opacity: isActive ? 1 : 0, transition: "opacity 200ms linear" };
  }
  const duration = isActive ? 520 : 220;
  const delay = isActive ? order * 70 : 0;
  return {
    opacity: isActive ? 1 : 0,
    transform: isActive ? "translateY(0)" : "translateY(10px)",
    transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  };
}
