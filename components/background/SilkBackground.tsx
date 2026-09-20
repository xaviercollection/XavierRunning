"use client";

import { useEffect, useRef } from "react";

/** Color presets for the silk field. `silk` keeps the original purple-gray
 * look from the 21st component; `champagne` remains available for isolated
 * accents, but is no longer the site's global background. */
const TONES = {
  silk: {
    stops: ["#1a1a1a", "#2a2a2a", "#1a1a1a"],
    rgb: [123, 116, 129],
  },
  champagne: {
    stops: ["#0d0b07", "#1b1710", "#0f0c08"],
    rgb: [200, 164, 93],
  },
} as const;

type ToneKey = keyof typeof TONES;

interface SilkBackgroundProps {
  tone?: ToneKey;
  className?: string;
  /** Render resolution multiplier — below 1 saves a lot of per-frame cost on
   *  large viewports (0.5 keeps the effect but at a quarter of the pixels). */
  scale?: number;
}

/**
 * Full-viewport flowing-silk canvas. Per-frame cost is controlled with a
 * render scale and a ~30fps throttle; the rAF loop pauses entirely while the
 * element is off-screen, and reduced motion renders one static frame.
 */
export function SilkBackground({ tone = "silk", className, scale = 0.55 }: SilkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = TONES[tone];

    let time = 0;
    let disposed = false;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;
    const speed = 0.02;
    const textureScale = 2;
    const noiseIntensity = 0.8;

    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      const width = parent ? parent.clientWidth : window.innerWidth;
      const height = parent ? parent.clientHeight : window.innerHeight;
      const renderScale = Math.min(1, Math.max(0.35, scale));
      canvas.width = Math.max(1, Math.floor(width * renderScale));
      canvas.height = Math.max(1, Math.floor(height * renderScale));
      ctx.imageSmoothingEnabled = true;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Simple noise function
    const noise = (x: number, y: number) => {
      const G = 2.71828;
      const rx = G * Math.sin(G * x);
      const ry = G * Math.sin(G * y);
      return (rx * ry * (1 + x)) % 1;
    };

    const render = () => {
      const { width, height } = canvas;
      if (!width || !height) return;

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, colors.stops[0]);
      gradient.addColorStop(0.5, colors.stops[1]);
      gradient.addColorStop(1, colors.stops[2]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Create silk-like pattern
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      // Fill every pixel. The reference implementation advanced by two on
      // both axes but wrote only one pixel, leaving three transparent pixels
      // per sample. Against the black base those gaps appeared as a grid of
      // dark squares, especially during zoom and scroll transforms.
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const u = (x / width) * textureScale;
          const v = (y / height) * textureScale;

          const tOffset = speed * time;
          const tex_x = u;
          const tex_y = v + 0.03 * Math.sin(8.0 * tex_x - tOffset);

          const pattern =
            0.6 +
            0.4 *
              Math.sin(
                5.0 *
                  (tex_x +
                    tex_y +
                    Math.cos(3.0 * tex_x + 5.0 * tex_y) +
                    0.02 * tOffset) +
                  Math.sin(20.0 * (tex_x + tex_y - 0.1 * tOffset))
              );

          const rnd = noise(x, y);
          const intensity = Math.max(0, pattern - (rnd / 15.0) * noiseIntensity);

          const r = Math.floor(colors.rgb[0] * intensity);
          const g = Math.floor(colors.rgb[1] * intensity);
          const b = Math.floor(colors.rgb[2] * intensity);
          const a = 255;

          const index = (y * width + x) * 4;
          if (index < data.length) {
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = a;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Add subtle overlay for depth
      const overlayGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 2
      );
      overlayGradient.addColorStop(0, "rgba(0, 0, 0, 0.1)");
      overlayGradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");

      ctx.fillStyle = overlayGradient;
      ctx.fillRect(0, 0, width, height);

      time += 1;
    };

    // Reduced motion: render a single static frame and stop.
    if (isReduced) {
      render();
      return () => {
        disposed = true;
        window.removeEventListener("resize", resizeCanvas);
      };
    }

    // Pause the whole loop while the silk is off-screen (~60% battery win
    // once the user scrolls past the hero).
    let inView = true;
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    });
    observer.observe(canvas);

    const animate = (timestamp: number) => {
      if (disposed) return;
      if (inView && document.visibilityState !== "hidden") {
        if (timestamp - lastFrame >= frameInterval) {
          render();
          lastFrame = timestamp;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [tone, scale]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ imageRendering: "auto" }}
    />
  );
}
