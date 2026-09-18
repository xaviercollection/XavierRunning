"use client";

import { useEffect, useRef, type CSSProperties, type ElementType } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/useReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type SplitTitleVariant = "converge" | "rise" | "orbit";

interface SplitTitleProps {
  text?: string;
  lines?: string[];
  as?: ElementType;
  variant?: SplitTitleVariant;
  className?: string;
  start?: string;
  end?: string;
  lineParallax?: boolean;
}

function centerIndex(len: number) {
  return Math.floor(len / 2);
}

/** Initial per-character offset, mirrored from the reference:
 *  every character sits displaced proportionally to its distance from the
 *  center of the line and converges to neutral while scrolling. */
function fromFor(index: number, center: number, variant: SplitTitleVariant) {
  const dist = index - center;
  const abs = Math.abs(dist);
  switch (variant) {
    case "orbit":
      return { x: dist * 90, rotate: dist * 40, y: -abs * 20, scale: 0.72 };
    case "rise":
      return { x: dist * 55, y: abs * 60, scale: 0.72 };
    case "converge":
    default:
      return { x: dist * 70, rotateX: dist * 55, transformPerspective: 500 };
  }
}

/** Renders one line as words — each word keeps its characters inline-block
 *  (fixed layout box, so the heading still wraps cleanly between words on
 *  small screens) while characters are free to be displaced by transforms.
 *  Spaces between words are real text nodes so the line can break. */
function SplitLine({ line }: { line: string }) {
  const words = line.split(" ");

  return (
    <>
      {words.map((word, wi) => {
        const offset = words.slice(0, wi).reduce((acc, w) => acc + w.length + 1, 0);
        return (
          <span key={wi}>
            <span
              data-split-word
              className="inline-block whitespace-nowrap"
            >
              {word.split("").map((char, ci) => (
                <span
                  key={ci}
                  data-split-char
                  data-split-index={offset + ci}
                  aria-hidden="true"
                  className="inline-block will-change-transform"
                >
                  {char}
                </span>
              ))}
            </span>
            {wi < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </>
  );
}

/**
 * Splits a title into characters and converges them into place while the
 * reader scrolls — every glyph displaced in proportion to its distance from
 * the line's center, settling to neutral. Scroll-scrubbed via GSAP.
 *
 * `lines` renders each entry on its own block (with an optional alternating
 * lateral parallax), keeping stacked display words intact.
 */
export function SplitTitle({
  text,
  lines,
  as = "h2",
  variant = "converge",
  className,
  start = "top 88%",
  end = "top 38%",
  lineParallax = true,
}: SplitTitleProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  const resolvedLines = lines ?? (text ? [text] : []);

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const lineEls = Array.from(container.querySelectorAll<HTMLElement>("[data-split-line]"));

      lineEls.forEach((line) => {
        const chars = Array.from(line.querySelectorAll<HTMLElement>("[data-split-char]"));
        const words = Array.from(line.querySelectorAll<HTMLElement>("[data-split-word]"));
        const spaceCount = words.length - 1;
        const center = centerIndex(chars.length + spaceCount);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start,
            end,
            scrub: true,
          },
        });

        chars.forEach((el) => {
          const index = Number(el.dataset.splitIndex ?? 0);
          tl.fromTo(
            el,
            fromFor(index, center, variant),
            { x: 0, y: 0, rotate: 0, rotateX: 0, scale: 1, ease: "none", immediateRender: true },
            0,
          );
        });
      });

      if (lineParallax && lineEls.length > 1) {
        lineEls.forEach((el, i) => {
          gsap.fromTo(
            el,
            { xPercent: 0 },
            {
              xPercent: i % 2 === 0 ? 4 : -4,
              ease: "none",
              scrollTrigger: {
                trigger: container,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });
      }
    }, container);
    return () => ctx.revert();
  }, [reducedMotion, variant, start, end, lineParallax, text, lines]);

  const needsPerspective = variant === "converge";
  const Tag = as as ElementType;

  return (
    <Tag
      ref={containerRef}
      className={className}
      style={needsPerspective ? ({ perspective: "500px" } as CSSProperties) : undefined}
      aria-label={lines ? lines.join(" ") : text}
    >
      {resolvedLines.map((line, li) => (
        <span
          key={li}
          data-split-line
          className={lines ? "block" : undefined}
        >
          <SplitLine line={line} />
        </span>
      ))}
    </Tag>
  );
}