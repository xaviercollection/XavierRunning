"use client";

import { useEffect, useRef } from "react";

interface AlphaKeyedVideoProps {
  src: string;
  /** Viewport/tab gate — the clip's own loop keeps running while true. */
  playing: boolean;
  /** Freezes on the clean opening frame and never re-processes it. */
  static?: boolean;
  className?: string;
  onReady?: () => void;
}

const PROCESS_WIDTH = 480;

/**
 * These brand clips were exported as opaque MP4 with a checkerboard baked
 * into the pixels wherever the source had transparency — plain MP4/H.264
 * carries no alpha channel, so the export tool flattened it onto a
 * checkerboard instead. A CSS blend mode can only recolor that pattern, not
 * remove it, so this keys it out for real: every frame is drawn to a
 * hidden canvas, and any pixel that is both low-saturation and bright (the
 * signature the two checkerboard tones share; the gold mark doesn't) gets
 * faded to alpha 0. The visible canvas is what actually renders — the
 * <video> underneath is only ever a decode source.
 */
export function AlphaKeyedVideo({ src, playing, static: staticFrame, className, onReady }: AlphaKeyedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readyFiredRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    // Nearest-neighbor, not bilinear: the source checkerboard's cells are
    // large enough to survive downscaling intact this way. Bilinear
    // blending averages adjacent light/dark cells into a spread of
    // in-between grays that lands right inside the keying threshold,
    // which is what produced speckled noise instead of a clean key.
    ctx.imageSmoothingEnabled = false;

    let width = 0;
    let height = 0;
    let smoothedAlpha: Float32Array | null = null;

    const setup = () => {
      const aspect = video.videoWidth / video.videoHeight || 16 / 9;
      width = PROCESS_WIDTH;
      height = Math.round(PROCESS_WIDTH / aspect);
      canvas.width = width;
      canvas.height = height;
      smoothedAlpha = null;
      keyFrame();
      if (!readyFiredRef.current) {
        readyFiredRef.current = true;
        onReady?.();
      }
    };

    const keyFrame = () => {
      if (!width) return;
      ctx.drawImage(video, 0, 0, width, height);
      const frame = ctx.getImageData(0, 0, width, height);
      const d = frame.data;
      const pixelCount = width * height;
      const rawAlpha = new Uint8ClampedArray(pixelCount);

      for (let p = 0; p < pixelCount; p++) {
        const i = p * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max - min;
        const lum = (r + g + b) / 3;
        const satScore = Math.min(1, Math.max(0, 1 - sat / 30));
        const lumScore = Math.min(1, Math.max(0, (lum - 175) / 20));
        const keyAmount = satScore * lumScore;
        rawAlpha[p] = keyAmount > 0 ? Math.round(d[i + 3] * (1 - keyAmount)) : d[i + 3];
      }

      // The source carries real per-frame grain — measured at ~34% of
      // pixels shifting alpha noticeably frame to frame — so a hard
      // per-pixel key leaves scattered, flickering specks in what should
      // be flat, empty checkerboard. Two passes clean that up: a 3x3
      // box-blur smothers isolated single-frame noise spatially, then an
      // exponential moving average across frames damps whatever still
      // flickers temporally. Colors are never touched, only alpha.
      const spatialAlpha = new Float32Array(pixelCount);
      for (let y = 0; y < height; y++) {
        const rowBase = y * width;
        for (let x = 0; x < width; x++) {
          let sum = 0;
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            const neighborRow = ny * width;
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              sum += rawAlpha[neighborRow + nx];
              count++;
            }
          }
          spatialAlpha[rowBase + x] = sum / count;
        }
      }

      if (!smoothedAlpha || smoothedAlpha.length !== pixelCount) {
        smoothedAlpha = spatialAlpha;
      } else {
        for (let p = 0; p < pixelCount; p++) {
          smoothedAlpha[p] = smoothedAlpha[p] * 0.82 + spatialAlpha[p] * 0.18;
        }
      }

      // Dead-zone the low end: what's left of the grain after both blurs is
      // faint (low alpha), while real logo edges are either solidly opaque
      // or a smooth mid-range gradient. Snapping anything below this floor
      // to 0 removes the residual speckle without visibly hardening a
      // genuine soft edge.
      for (let p = 0; p < pixelCount; p++) {
        const a = smoothedAlpha[p];
        d[p * 4 + 3] = a < 75 ? 0 : Math.round(a);
      }

      ctx.putImageData(frame, 0, 0);
    };

    let rafId: number | null = null;
    const loop = () => {
      keyFrame();
      rafId = requestAnimationFrame(loop);
    };

    if (video.readyState >= 1) setup();
    video.addEventListener("loadedmetadata", setup);

    if (staticFrame) {
      video.pause();
      video.currentTime = 0;
      video.addEventListener("seeked", keyFrame);
    } else if (playing) {
      video.play().catch(() => {});
      rafId = requestAnimationFrame(loop);
    } else {
      video.pause();
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      video.removeEventListener("loadedmetadata", setup);
      video.removeEventListener("seeked", keyFrame);
    };
  }, [playing, staticFrame, onReady]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}>
      <video ref={videoRef} src={src} muted loop playsInline preload="auto" autoPlay style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
