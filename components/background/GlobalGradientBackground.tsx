'use client';

import React, { useEffect, useRef } from 'react';

/**
 * The Xavier ambient field — a near-black canvas that stays a quiet,
 * non-photographic backdrop at every resolution. It carries three things
 * and nothing more: a warm-dark base, a very faint champagne breath of
 * light up top (so perfume sections read as "lit"), and slow drifting
 * noise so the page never feels flat. It must never compete with content.
 */
export function GlobalGradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const targetFPS = 24;
    const frameInterval = 1000 / targetFPS;
    const renderScale = () => (window.innerWidth < 768 ? 0.35 : 0.5);

    let disposed = false;
    let lastFrame = 0;

    const resizeCanvas = () => {
      const scale = renderScale();
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
    };

    resizeCanvas();

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 140);
    };
    window.addEventListener('resize', handleResize);

    const noise = (x: number, y: number) => {
      const G = 2.71828;
      const rx = G * Math.sin(G * x);
      const ry = G * Math.sin(G * y);
      return (rx * ry * (1 + x)) % 1;
    };

    const render = () => {
      const { width, height } = canvas;
      if (!width || !height) return;

      // Warm-dark base — never gray, always "lit from below the image".
      const base = ctx.createLinearGradient(0, 0, 0, height);
      base.addColorStop(0, '#070503');
      base.addColorStop(0.55, '#040404');
      base.addColorStop(1, '#080504');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);

      // Champagne breath — a soft presence, perceptible but never a disc.
      const glow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.2,
        0,
        width * 0.5,
        height * 0.2,
        Math.max(width, height) * 0.62,
      );
      glow.addColorStop(0, 'rgba(200, 164, 93, 0.06)');
      glow.addColorStop(1, 'rgba(200, 164, 93, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Drifting warm noise — low amplitude, deep warm grays only.
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let x = 0; x < width; x += 2) {
        for (let y = 0; y < height; y += 2) {
          const u = (x / width) * 2;
          const v = (y / height) * 2;
          const tOffset = 0.015 * time;
          const texX = u;
          const texY = v + 0.03 * Math.sin(7 * texX - tOffset);
          const pattern =
            0.55 +
            0.45 *
            Math.sin(
              5 * (texX + texY + Math.cos(3 * texX + 5 * texY) + 0.02 * tOffset) +
                Math.sin(18 * (texX + texY - 0.08 * tOffset)),
            );
          const rnd = noise(x, y);
          const intensity = Math.max(0, pattern - (rnd / 22) * 0.7);

          const idx = (y * width + x) * 4;
          if (idx + 3 < data.length) {
            // Deep warm neutrals (#0e0c09..#14110c-ish) — mono + faint warmth.
            data[idx] = Math.floor(9 + 8 * intensity);
            data[idx + 1] = Math.floor(8 + 6 * intensity);
            data[idx + 2] = Math.floor(7 + 4 * intensity);
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Vignette — keeps edges an honest black on every aspect ratio.
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75,
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      time += 1;
    };

    const animate = (timestamp: number) => {
      if (disposed) return;
      if (document.visibilityState !== 'hidden') {
        if (timestamp - lastFrame >= frameInterval) {
          render();
          lastFrame = timestamp;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      render();
    } else {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
    </div>
  );
}