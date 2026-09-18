"use client";

import { useEffect, useRef } from "react";
import type { FocalPoint } from "@/lib/media";
import { loadImage, loadWithConcurrency, makeFrameSrcResolver } from "./frameLoader";

const DEFAULT_FOCAL: FocalPoint = { x: 0.5, y: 0.5 };
const MOBILE_BREAKPOINT = 768;
const NEIGHBOR_SEARCH_RADIUS = 8;

export interface FrameSequencePlayerProps {
  basePath: string;
  frameCount: number;
  /** Playback speed. The Asad sequence (120 frames) at 12fps runs ~10s per loop. */
  fps?: number;
  /** Only the active card animates — everyone else shows `posterFrame` and stays put. */
  playing: boolean;
  posterFrame?: number;
  /** Always renders as "cover" — this lives inside a fixed-aspect card, never a page. */
  focalPoint?: FocalPoint;
  mobileFocalPoint?: FocalPoint;
  className?: string;
  onFirstFrameReady?: () => void;
}

/**
 * Canvas + rAF frame-sequence player. No React state per frame — the frame
 * index and the canvas draw both live in refs, so playback never re-renders
 * the component tree. Reused by any carousel card whose media is a sequence.
 */
export function FrameSequencePlayer({
  basePath,
  frameCount,
  fps = 12,
  playing,
  posterFrame = 0,
  focalPoint = DEFAULT_FOCAL,
  mobileFocalPoint,
  className,
  onFirstFrameReady,
}: FrameSequencePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const currentFrameRef = useRef(posterFrame);
  const readyFiredRef = useRef(false);
  const frameSrcRef = useRef(makeFrameSrcResolver(basePath));

  const onFirstFrameReadyRef = useRef(onFirstFrameReady);
  useEffect(() => {
    onFirstFrameReadyRef.current = onFirstFrameReady;
  });

  const draw = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let image = imagesRef.current.get(index);
    if (!image) {
      for (let offset = 1; offset <= NEIGHBOR_SEARCH_RADIUS && !image; offset += 1) {
        image = imagesRef.current.get(index - offset) ?? imagesRef.current.get(index + offset);
      }
    }
    if (!image) return;

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const imgW = image.naturalWidth;
    const imgH = image.naturalHeight;
    if (!canvasW || !canvasH || !imgW || !imgH) return;

    const isMobile = window.innerWidth < MOBILE_BREAKPOINT || canvasW < canvasH;
    const focal = (isMobile ? mobileFocalPoint : focalPoint) ?? DEFAULT_FOCAL;

    // Always cover — the card itself owns the aspect ratio, so the frame
    // must fill it edge to edge with zero letterboxing.
    const scale = Math.max(canvasW / imgW, canvasH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = Math.min(0, Math.max(canvasW - drawW, canvasW / 2 - focal.x * drawW));
    const dy = Math.min(0, Math.max(canvasH - drawH, canvasH / 2 - focal.y * drawH));

    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(image, 0, 0, imgW, imgH, dx, dy, drawW, drawH);
  };

  // Canvas backing store: CSS size × capped DPR, resized on container change.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let raf = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
        }
      }
      draw(currentFrameRef.current);
    };

    resize();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(resize);
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focalPoint, mobileFocalPoint]);

  // Preload: poster frame first (gates onFirstFrameReady), the rest in the background.
  useEffect(() => {
    let cancelled = false;
    const frameSrc = frameSrcRef.current;

    (async () => {
      const poster = await loadImage(frameSrc(posterFrame)).catch(() => null);
      if (cancelled) return;
      if (poster) {
        imagesRef.current.set(posterFrame, poster);
        draw(currentFrameRef.current);
        if (!readyFiredRef.current) {
          readyFiredRef.current = true;
          onFirstFrameReadyRef.current?.();
        }
      }

      const rest: number[] = [];
      for (let i = 0; i < frameCount; i += 1) if (i !== posterFrame) rest.push(i);
      await loadWithConcurrency(
        rest,
        6,
        async (index) => {
          if (imagesRef.current.has(index)) return;
          const image = await loadImage(frameSrc(index));
          if (cancelled) return;
          imagesRef.current.set(index, image);
          if (index === currentFrameRef.current) draw(index);
        },
        () => cancelled,
      );
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, frameCount, posterFrame]);

  // Playback loop — only runs while `playing`; restarts cleanly from frame 0
  // every time it flips on, and pauses itself when the tab is backgrounded.
  useEffect(() => {
    if (!playing) {
      currentFrameRef.current = posterFrame;
      draw(posterFrame);
      return;
    }

    currentFrameRef.current = 0;
    draw(imagesRef.current.has(0) ? 0 : posterFrame);

    const frameDuration = 1000 / fps;
    let rafId = 0;
    let lastTick = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastTick;
      if (elapsed >= frameDuration) {
        const advance = Math.floor(elapsed / frameDuration);
        lastTick = now - (elapsed % frameDuration);
        currentFrameRef.current = (currentFrameRef.current + advance) % frameCount;
        draw(currentFrameRef.current);
      }
      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const start = () => {
      if (rafId) return;
      lastTick = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    start();

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, fps, frameCount, posterFrame]);

  return (
    <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className ?? ""}`}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  );
}
