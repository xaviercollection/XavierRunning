"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface HeroSectionProps {
  onReady: () => void;
  onLoadProgress: (ratio: number) => void;
}

// GSAP's power3.out approximates the requested cubic-bezier(0.16, 1, 0.3, 1)
// closely enough without pulling in the CustomEase plugin — same "fast open,
// settle softly, never bounce" shape already used elsewhere in this project.
const GSAP_EASE = "power3.out";

// Both PNGs are padded to a square canvas; the visible glyph only fills a
// fraction of it (measured via alpha-channel bounding box). Cropping each
// wrapper to the glyph's own aspect ratio — instead of the full square —
// keeps every pixel of on-screen height meaningful, which is what stops the
// wordmark's ~68% of transparent padding from pushing the CTA off-screen.
const SYMBOL_CONTENT_ASPECT = 0.911;
const WORDMARK_CONTENT_ASPECT = 2.839;

/**
 * The brand-opening moment: a real store photograph as atmosphere, with the
 * Xavier symbol and the XAVIER wordmark — two genuinely transparent PNGs —
 * composed over it as independent objects. A short sticky stage (not the
 * 160vh+ split-apart version from before) carries a quick, restrained
 * transition into "Fragrâncias" once the visitor starts scrolling.
 */
export function HeroSection({ onReady, onLoadProgress }: HeroSectionProps) {
  const reducedMotion = useReducedMotion();

  const heroRef = useRef<HTMLElement | null>(null);
  // Overlay: the cinematic darkening keeps the marks legible against the
  // ambient background.
  const overlayRef = useRef<HTMLDivElement | null>(null);
  // Gold bloom behind the marks: scroll-fade (outer), mouse parallax
  // (middle), continuous breathing opacity (inner) — three more nodes for
  // the same reason.
  const bloomScrollRef = useRef<HTMLDivElement | null>(null);
  const bloomParallaxRef = useRef<HTMLDivElement | null>(null);
  const bloomBreatheRef = useRef<HTMLDivElement | null>(null);
  // Every concern — entrance, scroll, idle float, mouse parallax — gets its
  // own nested wrapper/ref. They compose visually through nested transforms,
  // but each GSAP animation only ever touches its own node: two animations
  // fighting over the same element's opacity/transform is what silently
  // froze the entrance sequence mid-flight the first time this was wired
  // with entrance and scroll sharing a single ref.
  const symbolEntranceRef = useRef<HTMLDivElement | null>(null);
  const symbolScrollRef = useRef<HTMLDivElement | null>(null);
  const symbolFloatRef = useRef<HTMLDivElement | null>(null);
  const symbolParallaxRef = useRef<HTMLDivElement | null>(null);
  const wordmarkEntranceRef = useRef<HTMLDivElement | null>(null);
  const wordmarkScrollRef = useRef<HTMLDivElement | null>(null);
  const wordmarkFloatRef = useRef<HTMLDivElement | null>(null);
  const wordmarkParallaxRef = useRef<HTMLDivElement | null>(null);
  const collectionRef = useRef<HTMLParagraphElement | null>(null);
  const taglineRef = useRef<HTMLParagraphElement | null>(null);
  const phraseRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  const readyFiredRef = useRef(false);
  const [imagesLoaded, setImagesLoaded] = useState(0);

  const fireReady = () => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    onLoadProgress(1);
    onReady();
  };

  const handleImageLoad = () => {
    setImagesLoaded((n) => n + 1);
  };

  // Notifying the parent belongs in an effect, not inside the setState
  // updater above — updaters can run during React's render phase, and
  // calling another component's setter from there is what threw "Cannot
  // update a component while rendering a different component".
  useEffect(() => {
    if (imagesLoaded === 0) return;
    onLoadProgress(Math.min(1, imagesLoaded / 3));
    if (imagesLoaded >= 3) fireReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesLoaded]);

  useEffect(() => {
    const fallback = setTimeout(fireReady, 1800);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entrance — symbol, wordmark, COLLECTION, tagline/phrase, CTA, in that
  // order, then idle floating takes over. Reduced motion skips straight to
  // the resting state.
  useEffect(() => {
    const targets = [
      symbolEntranceRef.current,
      wordmarkEntranceRef.current,
      collectionRef.current,
      taglineRef.current,
      phraseRef.current,
      ctaRef.current,
    ];
    if (targets.some((t) => !t)) return;

    if (reducedMotion) {
      gsap.set(targets, { opacity: 1, y: 0, scale: 1, clearProps: "letterSpacing" });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: GSAP_EASE } });
    tl.fromTo(symbolEntranceRef.current, { opacity: 0, y: 18, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.9 })
      .fromTo(wordmarkEntranceRef.current, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.65")
      .fromTo(
        collectionRef.current,
        { opacity: 0, letterSpacing: "0.05em" },
        { opacity: 1, letterSpacing: "0.4em", duration: 1 },
        "-=0.55",
      )
      .fromTo(taglineRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.7")
      .fromTo(phraseRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.55")
      .fromTo(ctaRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.4");

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  // Idle float — the symbol and wordmark drift on deliberately unsynced
  // loops: depth comes from the marks never aligning. Luxurious, not gimmicky:
  // a few pixels of travel, tiny rotation, hair of scale, 6-8s cycles. The
  // amplitude eases on small screens, and nothing runs under reduced motion.
  useEffect(() => {
    const symbol = symbolFloatRef.current;
    const wordmark = wordmarkFloatRef.current;
    if (!symbol || !wordmark || reducedMotion) return;

    const soft = window.innerWidth < 768 ? 0.55 : 1;

    const symbolTl = gsap.timeline({ repeat: -1, yoyo: true, ease: "sine.inOut" });
    symbolTl
      .to(symbol, { y: 6 * soft, x: 2 * soft, rotation: 1.2, scale: 1.01, duration: 3.2 }, 0)
      .to(symbol, { y: -6 * soft, x: -2 * soft, rotation: -1.2, scale: 0.99, duration: 3.2 }, 3.2);

    const wordmarkTl = gsap.timeline({ repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.9 });
    wordmarkTl
      .to(wordmark, { y: 4 * soft, x: -2 * soft, scale: 1.008, duration: 3.6 }, 0)
      .to(wordmark, { y: -5 * soft, x: 2 * soft, scale: 1, duration: 3.6 }, 3.6);

    return () => {
      symbolTl.kill();
      wordmarkTl.kill();
    };
  }, [reducedMotion]);

  // Gold bloom — a near-imperceptible breathing opacity, independent of the
  // scroll fade and the mouse parallax that also touch this layer.
  useEffect(() => {
    const bloom = bloomBreatheRef.current;
    if (!bloom || reducedMotion) return;
    const tween = gsap.fromTo(
      bloom,
      { opacity: 0.8 },
      { opacity: 1, duration: 4.5, ease: "sine.inOut", yoyo: true, repeat: -1 },
    );
    return () => {
      tween.kill();
    };
  }, [reducedMotion]);

  // Desktop mouse parallax — bloom, symbol and wordmark each get a
  // separate quickTo layer so they don't fight the idle float, the breathe
  // loop, or each other. Bloom drifts opposite the marks, which is what
  // sells the depth.
  useEffect(() => {
    const hero = heroRef.current;
    const symbol = symbolParallaxRef.current;
    const wordmark = wordmarkParallaxRef.current;
    const bloom = bloomParallaxRef.current;
    if (!hero || !symbol || !wordmark || !bloom || reducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const symbolX = gsap.quickTo(symbol, "x", { duration: 0.7, ease: "power3.out" });
    const symbolY = gsap.quickTo(symbol, "y", { duration: 0.7, ease: "power3.out" });
    const wordmarkX = gsap.quickTo(wordmark, "x", { duration: 0.7, ease: "power3.out" });
    const wordmarkY = gsap.quickTo(wordmark, "y", { duration: 0.7, ease: "power3.out" });
    const bloomX = gsap.quickTo(bloom, "x", { duration: 0.9, ease: "power3.out" });
    const bloomY = gsap.quickTo(bloom, "y", { duration: 0.9, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      // Restrained: content stays still, symbol moves the most (~7px), the
      // wordmark half that (~4px), the bloom drifts a hair the other way.
      symbolX(nx * 7);
      symbolY(ny * 7);
      wordmarkX(nx * 4);
      wordmarkY(ny * 4);
      bloomX(nx * -6);
      bloomY(ny * -6);
    };
    const handleMouseLeave = () => {
      symbolX(0);
      symbolY(0);
      wordmarkX(0);
      wordmarkY(0);
      bloomX(0);
      bloomY(0);
    };

    hero.addEventListener("mousemove", handleMouseMove);
    hero.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [reducedMotion]);

  // Scroll — short and restrained: nothing happens for the first ~75% of the
  // Hero's own (short) scroll range, then symbol/wordmark ease apart and
  // fade while the background darkens a touch, handing off to Fragrâncias.
  useEffect(() => {
    const hero = heroRef.current;
    const symbol = symbolScrollRef.current;
    const wordmark = wordmarkScrollRef.current;
    const overlay = overlayRef.current;
    const bloom = bloomScrollRef.current;
    if (!hero || !symbol || !wordmark || !overlay || !bloom) return;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom bottom", scrub: 0.3 },
    });

    if (reducedMotion) {
      tl.to([symbol, wordmark], { opacity: 0, ease: "none", duration: 0.25 }, 0.75);
    } else {
      tl.to(symbol, { y: -30, opacity: 0, ease: "none", duration: 0.25 }, 0.75)
        .to(wordmark, { y: 25, opacity: 0, ease: "none", duration: 0.25 }, 0.75)
        .to(overlay, { opacity: 0.96, ease: "none", duration: 0.25 }, 0.75)
        .to(bloom, { opacity: 0, ease: "none", duration: 0.25 }, 0.75);
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [reducedMotion]);

  return (
    <section ref={heroRef} id="top" className="relative h-[108svh] min-h-[620px] w-full md:h-[116svh]">
      <div className="sticky top-0 h-[100dvh] min-h-[620px] w-full overflow-hidden">
        {/* LAYER 1 — a fotografia real da loja ancora a abertura na Xavier.
            O recorte preserva a parede com a marca no desktop e mantém o
            ambiente reconhecível no celular. */}
        <Image
          src="/images/store/xavier-hero-store.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          onLoad={handleImageLoad}
          className="scale-[1.025] object-cover object-[66%_40%] md:object-[67%_41%]"
          style={{ filter: "blur(2px) brightness(0.56) saturate(0.72) contrast(1.04)" }}
        />

        {/* LAYER 2 — cinematic overlay: a soft diagonal for depth plus a
            vertical readability ramp, over the ambient background. The dark
            treatment keeps white text from fighting the page. */}
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.78,
            background:
              "linear-gradient(180deg, rgba(3,3,3,0.26) 0%, rgba(3,3,3,0.10) 40%, rgba(3,3,3,0.46) 78%, rgba(3,3,3,0.72) 100%), linear-gradient(90deg, rgba(3,3,3,0.52) 0%, rgba(3,3,3,0.16) 40%, rgba(3,3,3,0.40) 100%), radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(3,3,3,0.32) 100%)",
          }}
        />

        {/* LAYER 3 — champagne bloom behind the marks: two soft radials, a
            tighter warm core plus a broader faint wash, never a flat yellow
            disc and never large enough to tint the whole photo. */}
        <div ref={bloomScrollRef} className="pointer-events-none absolute inset-0">
          <div ref={bloomParallaxRef} className="absolute inset-0">
            <div
              ref={bloomBreatheRef}
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at center, rgba(199,163,90,0.18) 0%, rgba(199,163,90,0.08) 30%, rgba(199,163,90,0.02) 55%, transparent 72%)",
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <div ref={symbolEntranceRef}>
            <div ref={symbolScrollRef}>
              <div ref={symbolFloatRef} style={{ willChange: "transform" }}>
                <div
                  ref={symbolParallaxRef}
                  className="relative w-[clamp(120px,38vw,220px)] md:w-[clamp(180px,22vw,340px)]"
                  style={{ aspectRatio: SYMBOL_CONTENT_ASPECT, willChange: "transform" }}
                >
                  <Image
                    src="/images/brand/xavier-symbol-3d.webp"
                    alt="Xavier Collection"
                    fill
                    priority
                    sizes="(min-width: 768px) 22vw, 38vw"
                    onLoad={handleImageLoad}
                    className="object-cover"
                    style={{
                      objectPosition: "50% 52%",
                      filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 18px rgba(233,220,184,0.10))",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div ref={wordmarkEntranceRef} className="mt-1">
            <div ref={wordmarkScrollRef}>
              <div ref={wordmarkFloatRef} style={{ willChange: "transform" }}>
                <div
                  ref={wordmarkParallaxRef}
                  className="relative w-[clamp(260px,72vw,420px)] md:w-[clamp(380px,38vw,620px)]"
                  style={{ aspectRatio: WORDMARK_CONTENT_ASPECT, willChange: "transform" }}
                >
                  <Image
                    src="/images/brand/xavier-wordmark-3d.webp"
                    alt=""
                    aria-hidden="true"
                    fill
                    priority
                    sizes="(min-width: 768px) 38vw, 72vw"
                    onLoad={handleImageLoad}
                    className="object-cover"
                    style={{
                      objectPosition: "50% 50%",
                      filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 18px rgba(233,220,184,0.10))",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <p
            ref={collectionRef}
            className="mt-1 font-display text-sm tracking-[0.4em] text-[#e9dcb8] uppercase md:text-base"
          >
            Collection
          </p>
          <p ref={taglineRef} className="text-[11px] tracking-[0.28em] text-ink-muted uppercase md:text-xs">
            Moda masculina e perfumaria
          </p>
          <p ref={phraseRef} className="mt-2 font-display text-lg text-ink italic md:text-xl">
            Vista sua presença.
          </p>

          <a
            ref={ctaRef}
            href="#fragrancias"
            className="group mt-6 flex items-center gap-3 border border-gold/40 px-7 py-3 text-xs tracking-[0.25em] text-[#e9dcb8] uppercase transition-colors duration-300 hover:border-gold hover:text-gold md:text-sm"
          >
            Explorar coleção
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>

      </div>
    </section>
  );
}
