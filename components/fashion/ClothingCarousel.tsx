"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { ClothingItem } from "@/lib/clothingCatalog";
import { SplitTitle } from "@/components/ui/SplitTitle";

interface ClothingCarouselProps {
    items: ClothingItem[];
    id?: string;
}

const AUTOPLAY_INTERVAL = 6000;
const AUTOPLAY_RESUME_DELAY = 5000;
const SWIPE_THRESHOLD = 44;

/** How many cards are visible at each breakpoint */
function getVisible(): number {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
}

export function ClothingCarousel({ items, id }: ClothingCarouselProps) {
    const reducedMotion = useReducedMotion();
    const total = items.length;

    // `offset` = index of the leftmost visible card
    const [offset, setOffset] = useState(0);
    const [visible, setVisible] = useState(3);
    const [inViewport, setInViewport] = useState(false);
    const [hoverPaused, setHoverPaused] = useState(false);
    const [interactionPaused, setInteractionPaused] = useState(false);
    // highlighted card within the visible window (0..visible-1)
    const [focusedLocal, setFocusedLocal] = useState(0);

    const sectionRef = useRef<HTMLElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const touchRef = useRef<{ x: number; y: number; intent: "horizontal" | "vertical" | null } | null>(null);
    const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Sync visible count on resize
    useEffect(() => {
        const update = () => setVisible(getVisible());
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // When visible count changes, clamp offset + reset focus
    useEffect(() => {
        setOffset((o) => Math.min(o, Math.max(0, total - visible)));
        setFocusedLocal(0);
    }, [visible, total]);

    const maxOffset = Math.max(0, total - visible);

    const pauseAutoplay = useCallback(() => {
        setInteractionPaused(true);
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => setInteractionPaused(false), AUTOPLAY_RESUME_DELAY);
    }, []);

    const goNext = useCallback(() => {
        pauseAutoplay();
        setOffset((o) => {
            if (o >= maxOffset) return 0; // wrap
            return o + 1;
        });
        setFocusedLocal(0);
    }, [pauseAutoplay, maxOffset]);

    const goPrev = useCallback(() => {
        pauseAutoplay();
        setOffset((o) => {
            if (o <= 0) return maxOffset; // wrap
            return o - 1;
        });
        setFocusedLocal(0);
    }, [pauseAutoplay, maxOffset]);

    // Intersection observer
    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        const observer = new IntersectionObserver(
            ([entry]) => setInViewport(entry.isIntersecting),
            { threshold: 0.15 },
        );
        observer.observe(section);
        return () => observer.disconnect();
    }, []);

    // Arrow key nav
    useEffect(() => {
        if (!inViewport) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") goPrev();
            else if (e.key === "ArrowRight") goNext();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [inViewport, goNext, goPrev]);

    // Autoplay
    useEffect(() => {
        if (reducedMotion || !inViewport || hoverPaused || interactionPaused || total <= visible) return;
        const timer = setInterval(goNext, AUTOPLAY_INTERVAL);
        return () => clearInterval(timer);
    }, [reducedMotion, inViewport, hoverPaused, interactionPaused, total, visible, goNext]);

    useEffect(() => () => clearTimeout(resumeTimerRef.current), []);

    // Touch / swipe
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
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start || start.intent !== "horizontal") return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        if (dx <= -SWIPE_THRESHOLD) goNext();
        else if (dx >= SWIPE_THRESHOLD) goPrev();
    };

    // The highlighted card = offset + focusedLocal, clamped to valid range
    const highlightedIndex = Math.min(offset + focusedLocal, total - 1);
    const highlighted = items[highlightedIndex];

    // Progress bar: where are we in the full list?
    const progressPct = total <= 1 ? 100 : (offset / maxOffset) * 100;

    return (
        <section
            id={id}
            ref={sectionRef}
            aria-label="Coleção de Roupas Xavier Collection"
            className="relative xc-section overflow-hidden"
        >
            {/* Subtle ambience bloom from highlighted card */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 transition-opacity duration-700"
                style={{ opacity: 0.14 }}
            >
                {items.map((item, i) => (
                    <div
                        key={item.slug}
                        className="absolute inset-0 transition-opacity duration-700 ease-out"
                        style={{ opacity: i === highlightedIndex ? 1 : 0 }}
                    >
                        <Image
                            src={item.imageSrc}
                            alt=""
                            fill
                            sizes="100vw"
                            className="scale-[1.18] object-cover"
                            style={{ filter: "blur(48px) brightness(0.18) saturate(0.35) sepia(0.28)" }}
                            priority={i === 0}
                        />
                    </div>
                ))}
                {/* Edge dissolves */}
                <div className="absolute inset-x-0 top-0 h-[clamp(6rem,16vh,12rem)] bg-gradient-to-b from-[#040302]/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-[clamp(6rem,16vh,12rem)] bg-gradient-to-t from-[#040302]/60 to-transparent" />
            </div>

            <div className="xc-container relative z-10">
                {/* ─── Section header ─── */}
                <div className="mb-12 flex flex-col gap-8 md:mb-16 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="eyebrow">Coleção · Selected Goods</p>
                        <SplitTitle
                            variant="rise"
                            text="Vista sua identidade."
                            className="mt-5 max-w-2xl font-display text-[clamp(2.5rem,6.5vw,5.5rem)] leading-[0.95] text-ink text-balance"
                        />
                    </div>
                    <div className="flex flex-col items-start gap-5 md:items-end md:text-right">
                        <p className="max-w-sm text-sm leading-relaxed text-ink-muted text-balance">
                            Strike, Crosby e Zara — uma seleção
                            pensada para construir presença camada a camada.
                        </p>
                        {/* Prev / Next arrow buttons — desktop inline with description */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={goPrev}
                                aria-label="Peça anterior"
                                className="flex h-9 w-9 items-center justify-center border border-white/15 text-ink transition-colors duration-300 hover:border-gold hover:text-gold"
                            >
                                <ArrowIcon direction="left" />
                            </button>
                            <button
                                type="button"
                                onClick={goNext}
                                aria-label="Próxima peça"
                                className="flex h-9 w-9 items-center justify-center border border-white/15 text-ink transition-colors duration-300 hover:border-gold hover:text-gold"
                            >
                                <ArrowIcon direction="right" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Card track ─── */}
                <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseEnter={() => setHoverPaused(true)}
                    onMouseLeave={() => setHoverPaused(false)}
                    className="overflow-hidden"
                >
                    {/* Sliding rail — translates by one card-width per step */}
                    <div
                        ref={trackRef}
                        className="flex gap-[clamp(1rem,2.5vw,1.75rem)]"
                        style={{
                            // Each card is (100% - gaps) / visible wide; rail shifts by card+gap per offset step
                            transform: `translateX(calc((100% / ${visible} + clamp(1rem, 2.5vw, 1.75rem)) * -${offset}))`,
                            transition: reducedMotion ? "none" : "transform 700ms cubic-bezier(0.16,1,0.3,1)",
                        }}
                    >
                        {items.map((item, i) => {
                            const localIdx = i - offset;
                            const isVisible = localIdx >= 0 && localIdx < visible;
                            const isFocused = i === highlightedIndex;

                            return (
                                <div
                                    key={item.slug}
                                    className="flex-none"
                                    style={{
                                        width: `calc((100% - clamp(1rem, 2.5vw, 1.75rem) * ${visible - 1}) / ${visible})`,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isVisible) {
                                                setFocusedLocal(localIdx);
                                                pauseAutoplay();
                                            }
                                        }}
                                        className="group block w-full cursor-pointer text-left focus-visible:outline-none"
                                        aria-label={`Destacar ${item.name}`}
                                    >
                                        {/* Photo card */}
                                        <div
                                            className="relative aspect-[3/4] w-full overflow-hidden rounded-[2px] transition-all duration-500"
                                            style={{
                                                borderWidth: "1px",
                                                borderStyle: "solid",
                                                borderColor: isFocused
                                                    ? "rgba(200,164,93,0.55)"
                                                    : "rgba(255,255,255,0.08)",
                                                boxShadow: isFocused
                                                    ? "0 0 0 1px rgba(200,164,93,0.12), 0 24px 60px -20px rgba(0,0,0,0.8)"
                                                    : "0 8px 32px -12px rgba(0,0,0,0.6)",
                                            }}
                                        >
                                            <Image
                                                src={item.imageSrc}
                                                alt={`${item.name} — ${item.brand}`}
                                                fill
                                                sizes={`(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw`}
                                                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                                                style={{
                                                    objectPosition: `${(item.focalPoint?.x ?? 0.5) * 100}% ${(item.focalPoint?.y ?? 0.5) * 100}%`,
                                                    filter: isFocused ? "none" : "brightness(0.82)",
                                                    transition: "filter 600ms ease",
                                                }}
                                                priority={i < 3}
                                            />

                                            {/* Index badge */}
                                            <span
                                                aria-hidden="true"
                                                className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center border bg-black/40 font-display text-[10px] tracking-widest transition-colors duration-300"
                                                style={{
                                                    borderColor: isFocused ? "rgba(200,164,93,0.5)" : "rgba(255,255,255,0.1)",
                                                    color: isFocused ? "var(--color-gold)" : "var(--color-ink-faint)",
                                                }}
                                            >
                                                {String(i + 1).padStart(2, "0")}
                                            </span>

                                            {/* Bottom scrim + info */}
                                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-5 md:px-5 md:pb-6">
                                                <p
                                                    className="text-[9px] tracking-[0.38em] uppercase transition-colors duration-500"
                                                    style={{ color: isFocused ? "var(--color-gold)" : "var(--color-ink-faint)" }}
                                                >
                                                    {item.brand}
                                                </p>
                                                <h3 className="mt-1 font-display text-base leading-[0.95] text-ink md:text-lg">
                                                    {item.name}
                                                </h3>
                                                {item.price && (
                                                    <span className="mt-1 block font-display text-sm text-gold">{item.price}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Below-card label */}
                                        <div className="mt-4 flex items-center justify-between gap-4">
                                            <p className="text-[10px] tracking-[0.25em] text-ink-muted uppercase transition-colors duration-300 group-hover:text-gold">
                                                {item.tagline}
                                            </p>
                                            <span
                                                aria-hidden="true"
                                                className="text-[10px] tracking-[0.2em] text-ink-muted uppercase transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold"
                                            >
                                                →
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Progress bar + item count ─── */}
                <div className="mt-10 flex items-center gap-6">
                    {/* Thin progress rail */}
                    <div className="relative h-px flex-1 bg-white/8">
                        <div
                            className="absolute inset-y-0 left-0 bg-gold transition-all duration-700 ease-out"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    {/* Counter */}
                    <span className="whitespace-nowrap font-display text-xs tabular-nums text-ink-faint">
                        <span className="text-gold">{String(highlightedIndex + 1).padStart(2, "0")}</span>
                        {" / "}
                        {String(total).padStart(2, "0")}
                    </span>

                    {/* Mobile-only arrow buttons (desktop arrows are in the header row) */}
                    <div className="flex items-center gap-2 md:hidden">
                        <button
                            type="button"
                            onClick={goPrev}
                            aria-label="Peça anterior"
                            className="flex h-8 w-8 items-center justify-center border border-white/15 text-ink transition-colors duration-300 hover:border-gold hover:text-gold"
                        >
                            <ArrowIcon direction="left" />
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            aria-label="Próxima peça"
                            className="flex h-8 w-8 items-center justify-center border border-white/15 text-ink transition-colors duration-300 hover:border-gold hover:text-gold"
                        >
                            <ArrowIcon direction="right" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={15}
            height={15}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
        >
            {direction === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
        </svg>
    );
}
