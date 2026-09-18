"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { SplitTitle } from "@/components/ui/SplitTitle";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export function StoreLocation() {
    const sectionRef = useRef<HTMLElement | null>(null);
    const frameRef = useRef<HTMLDivElement | null>(null);
    const curtainRef = useRef<HTMLDivElement | null>(null);
    const imageWrapRef = useRef<HTMLDivElement | null>(null);
    const copyRef = useRef<HTMLDivElement | null>(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (reducedMotion) return;
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 72%",
                    toggleActions: "play none none reverse",
                },
            });

            tl.fromTo(
                curtainRef.current,
                { scaleX: 1 },
                { scaleX: 0, duration: 1.4, ease: "power4.inOut", transformOrigin: "right" },
            ).fromTo(
                copyRef.current,
                { opacity: 0, y: 28 },
                { opacity: 1, y: 0, duration: 1, ease: "power3.out" },
                "-=0.7",
            );

            gsap.fromTo(
                imageWrapRef.current,
                { scale: 1.08 },
                {
                    scale: 1,
                    ease: "none",
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: true,
                    },
                },
            );
        }, sectionRef);
        return () => ctx.revert();
    }, [reducedMotion]);

    return (
        <section
            id="onde-nos-encontrar"
            ref={sectionRef}
            className="relative xc-section overflow-hidden"
        >
            <div className="xc-container">
                {/* Section header */}
                <div className="mb-14 md:mb-20">
                    <p className="eyebrow">Endereço · Loja Física</p>
                    <SplitTitle
                        variant="rise"
                        text="Onde nos encontrar."
                        className="mt-5 max-w-2xl font-display text-[clamp(2.5rem,6.5vw,5.5rem)] leading-[0.95] text-ink text-balance"
                    />
                </div>

                {/* Content: image frame + address info */}
                <div className="flex flex-col gap-12 md:flex-row md:items-center md:gap-16 lg:gap-24">
                    {/* Gold-framed store photo */}
                    <div className="relative md:w-[58%] lg:w-[60%]">
                        {/* Outer gold border frame — editorial jewellery feel */}
                        <div
                            className="relative"
                            style={{
                                padding: "1px",
                                background: "linear-gradient(135deg, rgba(200,164,93,0.9) 0%, rgba(200,164,93,0.25) 40%, rgba(200,164,93,0.6) 70%, rgba(200,164,93,0.9) 100%)",
                            }}
                        >
                            {/* Inner subtle inset frame */}
                            <div
                                className="absolute inset-[6px] z-10 pointer-events-none"
                                style={{
                                    border: "1px solid rgba(200,164,93,0.22)",
                                    boxShadow: "inset 0 0 0 1px rgba(200,164,93,0.1)",
                                }}
                            />

                            {/* Corner ornaments */}
                            {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, idx) => (
                                <div
                                    key={idx}
                                    className={`absolute ${pos} z-20 pointer-events-none`}
                                    style={{
                                        width: "clamp(20px, 4vw, 36px)",
                                        height: "clamp(20px, 4vw, 36px)",
                                    }}
                                >
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: `linear-gradient(${[135, 225, 45, 315][idx]}deg, rgba(200,164,93,0.9) 0%, transparent 60%)`,
                                        }}
                                    />
                                </div>
                            ))}

                            {/* Photo wrap for parallax */}
                            <div
                                ref={frameRef}
                                className="relative overflow-hidden"
                                style={{ aspectRatio: "4/3" }}
                            >
                                <div ref={imageWrapRef} className="absolute inset-0">
                                    <Image
                                        src="/images/store/xavier-store-front.jpeg"
                                        alt="Fachada da loja física Xavier Collection — Rua Sólon de Lucena, 26, Centro de Arara"
                                        fill
                                        sizes="(min-width: 768px) 58vw, 100vw"
                                        className="object-cover object-center"
                                        priority
                                    />
                                </div>

                                {/* Reveal curtain */}
                                {!reducedMotion && (
                                    <div
                                        ref={curtainRef}
                                        className="pointer-events-none absolute inset-0"
                                        style={{ background: "var(--color-void)" }}
                                    />
                                )}

                                {/* Subtle inner vignette */}
                                <div
                                    className="pointer-events-none absolute inset-0"
                                    style={{
                                        background:
                                            "radial-gradient(ellipse at center, transparent 60%, rgba(3,3,3,0.35) 100%)",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Gold shimmer caption bar below frame */}
                        <div
                            className="mt-3 flex items-center gap-3 px-1"
                        >
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                            <span
                                className="text-[9px] tracking-[0.4em] text-gold/70 uppercase"
                            >
                                Xavier Collection · Store
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                        </div>
                    </div>

                    {/* Address & info copy */}
                    <div ref={copyRef} className="flex flex-col gap-8 md:w-[42%] lg:w-[40%]">
                        {/* Address block */}
                        <div>
                            <p className="text-[9px] tracking-[0.42em] text-gold uppercase mb-4">
                                Endereço
                            </p>
                            <address className="not-italic">
                                <p className="font-display text-[clamp(1.1rem,3vw,1.6rem)] leading-snug text-ink">
                                    Rua Sólon de Lucena,
                                    <br />
                                    número 26
                                </p>
                                <p className="mt-2 text-sm text-ink-muted tracking-wide">
                                    Centro de Arara
                                </p>
                            </address>
                        </div>

                        {/* Gold rule */}
                        <div className="rule-gold w-full" />

                        {/* Additional info */}
                        <div className="flex flex-col gap-5">
                            <div>
                                <p className="text-[9px] tracking-[0.42em] text-gold uppercase mb-2">
                                    Horário de funcionamento
                                </p>
                                <p className="text-sm text-ink-muted leading-relaxed">
                                    Segunda a Sábado<br />
                                    <span className="text-ink">08h às 18h</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] tracking-[0.42em] text-gold uppercase mb-2">
                                    Também online
                                </p>
                                <p className="text-sm text-ink-muted leading-relaxed">
                                    Atendimento disponível<br />
                                    <span className="text-ink">24 horas, 7 dias por semana</span>
                                </p>
                            </div>
                        </div>

                        {/* CTA */}
                        <a
                            href="https://maps.google.com/?q=Rua+Solon+de+Lucena+26+Arara"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-xc self-start mt-2"
                        >
                            Ver no mapa
                            <span aria-hidden="true" className="arrow">→</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
