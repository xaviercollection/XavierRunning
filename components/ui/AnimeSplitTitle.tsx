"use client";

import { memo, useEffect, useRef, type ElementType } from "react";
import { createTimeline, onScroll, set, stagger } from "animejs";
import { splitText } from "animejs/text";

interface AnimeSplitTitleProps {
  id?: string;
  text?: string;
  lines?: string[];
  as?: ElementType;
  className?: string;
}

function getSplitLine(element: unknown): number {
  return element instanceof HTMLElement ? Number(element.dataset.line ?? 0) : 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Responsive Anime.js SplitText heading. The library owns the generated
 * line, word and character wrappers, rebuilds them when the title width
 * changes and keeps an accessible unsplit copy for assistive technology.
 */
function AnimeSplitTitleComponent({
  id,
  text,
  lines,
  as = "h2",
  className,
}: AnimeSplitTitleProps) {
  const titleRef = useRef<HTMLElement | null>(null);
  const resolvedLines = lines ?? (text ? [text] : []);
  const contentKey = resolvedLines.join("\n");
  const titleHtml = resolvedLines.map(escapeHtml).join("<br />");
  const Tag = as as ElementType;

  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;
    let cancelled = false;
    let animationFrame: number | undefined;
    let split: ReturnType<typeof splitText> | undefined;

    const setupSplitText = () => {
      if (cancelled) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      split = splitText(title, {
        lines: { wrap: "clip" },
        words: { wrap: "clip" },
        chars: true,
        accessible: true,
      });

      split.addEffect((self) => {
        const scrollTarget = title.closest("section") ?? title;
        const scroll = onScroll({
          target: scrollTarget,
          enter: "92% start",
          leave: "38% start",
          sync: reducedMotion ? 0.25 : 0.7,
        });

        const lineDistance = reducedMotion ? "18%" : "105%";
        const charDistance = reducedMotion ? "10%" : "75%";
        const charRotation = reducedMotion ? "0deg" : "5deg";

        set(self.lines, {
          opacity: 0.18,
          y: (element: unknown) =>
            getSplitLine(element) % 2 ? lineDistance : `-${lineDistance}`,
        });
        set(self.chars, {
          opacity: 0.2,
          y: (element: unknown) =>
            getSplitLine(element) % 2 ? charDistance : `-${charDistance}`,
          rotate: (element: unknown) =>
            getSplitLine(element) % 2 ? charRotation : `-${charRotation}`,
        });

        const timeline = createTimeline({
          autoplay: false,
          defaults: { duration: 760, ease: "inOut(3)" },
        })
          .add(
            self.lines,
            {
              opacity: 1,
              delay: stagger(90),
              y: "0%",
            },
            0,
          )
          .add(
            self.chars,
            {
              opacity: 1,
              delay: stagger(9, { from: "center" }),
              y: "0%",
              rotate: "0deg",
            },
            0,
          );

        scroll.link(timeline);

        return () => {
          scroll.revert();
          timeline.revert();
        };
      });
    };

    // Defer construction until after fonts and the current React effect cycle.
    // In development Strict Mode immediately cleans up the first effect pass;
    // cancelling this frame prevents that discarded SplitText instance from
    // resolving its own font-ready callback and splitting the title twice.
    void document.fonts.ready.then(() => {
      if (!cancelled) animationFrame = requestAnimationFrame(setupSplitText);
    });

    return () => {
      cancelled = true;
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      split?.revert();
    };
  }, [contentKey]);

  return (
    <Tag
      ref={titleRef}
      id={id}
      className={className}
      aria-label={resolvedLines.join(" ")}
      dangerouslySetInnerHTML={{ __html: titleHtml }}
    />
  );
}

export const AnimeSplitTitle = memo(
  AnimeSplitTitleComponent,
  (previous, next) =>
    previous.id === next.id &&
    previous.text === next.text &&
    previous.lines?.join("\n") === next.lines?.join("\n") &&
    previous.as === next.as &&
    previous.className === next.className,
);
