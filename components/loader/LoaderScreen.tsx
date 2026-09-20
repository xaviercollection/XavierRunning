"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { animate, createTimeline, createTimer } from "animejs";
import * as THREE from "three";
import "animejs/adapters/three";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface LoaderScreenProps {
  progress: number;
  ready: boolean;
  onDone: () => void;
}

const LOADER_DURATION_MS = 3000;

export function LoaderScreen({ ready, onDone }: LoaderScreenProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement | null>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const polygonRef = useRef<SVGPolygonElement | null>(null);
  const orbitRef = useRef<SVGCircleElement | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const reducedMotion = useReducedMotion();
  const pct = Math.round(animatedProgress);
  const exiting = ready && minimumElapsed && animatedProgress >= 99.5;

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousBodyTouchAction = body.style.touchAction;

    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";

    const preventWheel = (event: WheelEvent) => event.preventDefault();
    const preventTouch = (event: TouchEvent) => event.preventDefault();
    const scrollKeys = new Set([
      "ArrowDown",
      "ArrowUp",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
      "Spacebar",
    ]);
    const preventScrollKeys = (event: KeyboardEvent) => {
      if (scrollKeys.has(event.key)) event.preventDefault();
    };

    window.addEventListener("wheel", preventWheel, { passive: false });
    window.addEventListener("touchmove", preventTouch, { passive: false });
    window.addEventListener("keydown", preventScrollKeys);

    return () => {
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.touchAction = previousBodyTouchAction;
      window.removeEventListener("wheel", preventWheel);
      window.removeEventListener("touchmove", preventTouch);
      window.removeEventListener("keydown", preventScrollKeys);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMinimumElapsed(true), LOADER_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const turbulence = turbulenceRef.current;
    const displacement = displacementRef.current;
    const polygon = polygonRef.current;
    const orbit = orbitRef.current;

    if (!turbulence || !displacement || !polygon || !orbit || reducedMotion) return;

    const turbulenceAnimation = animate(turbulence, {
      baseFrequency: [0.006, 0.022],
      duration: 1900,
      ease: "inOutSine",
      alternate: true,
      loop: true,
    });
    const displacementAnimation = animate(displacement, {
      scale: [3, 14],
      duration: 2400,
      ease: "inOutSine",
      alternate: true,
      loop: true,
    });
    const polygonAnimation = animate(polygon, {
      points: "50 3 97 47 53 97 3 53",
      duration: 2600,
      ease: "inOut(3)",
      alternate: true,
      loop: true,
    });
    const orbitAnimation = animate(orbit, {
      strokeDashoffset: -84,
      opacity: [0.25, 0.72],
      duration: 2800,
      ease: "linear",
      alternate: true,
      loop: true,
    });

    return () => {
      turbulenceAnimation.cancel();
      displacementAnimation.cancel();
      polygonAnimation.cancel();
      orbitAnimation.cancel();
    };
  }, [reducedMotion]);

  // Drive the visual progress from the exact same three-second clock as the
  // loader's minimum duration. This guarantees a continuous 0 → 100 journey
  // that reaches 100 precisely when the loader is allowed to fade out.
  useEffect(() => {
    let animationFrame = 0;
    const startedAt = performance.now();

    const animateProgress = (currentTime: number) => {
      const elapsed = currentTime - startedAt;
      const nextProgress = Math.min(100, (elapsed / LOADER_DURATION_MS) * 100);
      setAnimatedProgress(nextProgress);

      if (nextProgress < 100) {
        animationFrame = requestAnimationFrame(animateProgress);
      }
    };

    animationFrame = requestAnimationFrame(animateProgress);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let disposed = false;
    let logoTexture: THREE.Texture | null = null;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.className = "absolute inset-0 h-full w-full transition-opacity duration-500";
    renderer.domElement.style.opacity = "0";
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 6.5);

    const rig = new THREE.Group();
    rig.rotation.order = "YXZ";
    scene.add(rig);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.009, 10, 160),
      new THREE.MeshBasicMaterial({
        color: 0xc7a35a,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.rotation.x = THREE.MathUtils.degToRad(68);
    halo.rotation.z = THREE.MathUtils.degToRad(-18);
    halo.position.z = -0.25;
    rig.add(halo);

    const particleCount = 72;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1.85 + ((i * 17) % 23) / 28;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = Math.sin(angle) * radius * 0.72;
      particlePositions[i * 3 + 2] = -0.45 + ((i * 11) % 13) / 24;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xe9dcb8,
      size: 0.024,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    rig.add(particles);

    scene.add(new THREE.AmbientLight(0xfff2cf, 1.8));
    const keyLight = new THREE.PointLight(0xffd788, 23, 12, 1.5);
    keyLight.position.set(-2.4, 1.8, 3.5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x8e5b25, 14, 10, 1.7);
    rimLight.position.set(2.5, -1.4, 2);
    scene.add(rimLight);

    const logoGeometry = new THREE.PlaneGeometry(4.25, 4.25);
    let logoMaterial: THREE.MeshPhysicalMaterial | null = null;

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const width = Math.max(stage.clientWidth, 1);
      const height = Math.max(stage.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    new THREE.TextureLoader().load("/images/brand/xavier-symbol-3d.webp", (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }

      logoTexture = texture;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

      logoMaterial = new THREE.MeshPhysicalMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.015,
        depthWrite: false,
        metalness: 0.5,
        roughness: 0.34,
        clearcoat: 0.8,
        clearcoatRoughness: 0.22,
        emissive: new THREE.Color(0x241606),
        emissiveMap: texture,
        emissiveIntensity: 0.32,
        side: THREE.DoubleSide,
      });

      const logo = new THREE.Mesh(logoGeometry, logoMaterial);
      logo.position.z = 0.08;
      rig.add(logo);
      renderer.domElement.style.opacity = "1";
      setSceneReady(true);
      render();
    });

    const motionTimeline = reducedMotion
      ? null
      : createTimeline({ loop: true, alternate: true, defaults: { ease: "inOutSine" } })
          .add(
            rig,
            {
              rotateX: [4, -3],
              rotateY: [-15, 15],
              y: [-0.08, 0.09],
              scale: [0.985, 1.015],
              duration: 3200,
            },
            0,
          )
          .add(
            keyLight,
            {
              x: [-2.4, 2.4],
              y: [1.8, 0.8],
              intensity: [19, 28],
              duration: 3800,
            },
            0,
          );

    const orbitTimeline = reducedMotion
      ? null
      : createTimeline({ loop: true, defaults: { ease: "linear" } })
          .add(halo, { rotateZ: 360, duration: 13000 }, 0)
          .add(particles, { rotateZ: -360, duration: 26000 }, 0);

    const renderTimer = reducedMotion ? null : createTimer({ onUpdate: render });
    if (reducedMotion) render();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      motionTimeline?.cancel();
      orbitTimeline?.cancel();
      renderTimer?.cancel();
      logoGeometry.dispose();
      logoMaterial?.dispose();
      logoTexture?.dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
      if (stage.contains(renderer.domElement)) stage.removeChild(renderer.domElement);
    };
  }, [reducedMotion]);

  return (
    <div
      role="status"
      aria-label={`Carregando Xavier Collection: ${pct}%`}
      aria-hidden={exiting}
      onTransitionEnd={(event) => {
        if (exiting && event.propertyName === "opacity") onDone();
      }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#050505] transition-opacity duration-700"
      style={{
        opacity: exiting ? 0 : 1,
        pointerEvents: exiting ? "none" : "auto",
        transitionTimingFunction: "var(--ease-xavier)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 44%, rgba(199,163,90,0.17) 0%, rgba(199,163,90,0.055) 24%, transparent 52%), linear-gradient(180deg, #080705 0%, #030303 100%)",
        }}
      />

      <div aria-hidden="true" className="absolute inset-x-[8vw] top-1/2 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="relative z-10 flex flex-col items-center">
        <p className="mb-1 text-[9px] tracking-[0.48em] text-gold/75 uppercase md:text-[10px]">
          Xavier Collection
        </p>

        <div
          ref={stageRef}
          data-testid="xavier-3d-loader"
          className="relative aspect-square w-[min(76vw,22rem)] md:w-[25rem]"
        >
          <Image
            src="/images/brand/xavier-symbol-3d.webp"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="(min-width: 768px) 25rem, 76vw"
            className="object-contain transition-opacity duration-500"
            style={{ opacity: sceneReady ? 0 : 1 }}
          />

          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-[2%] z-20 h-[96%] w-[96%] overflow-visible mix-blend-screen"
          >
            <defs>
              <filter id="xavier-loader-distortion" x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence
                  ref={turbulenceRef}
                  type="fractalNoise"
                  baseFrequency="0.008"
                  numOctaves="2"
                  seed="4"
                  result="noise"
                />
                <feDisplacementMap
                  ref={displacementRef}
                  in="SourceGraphic"
                  in2="noise"
                  scale="5"
                  xChannelSelector="R"
                  yChannelSelector="B"
                />
              </filter>
            </defs>

            <g filter="url(#xavier-loader-distortion)">
              <polygon
                ref={polygonRef}
                points="50 7 93 50 50 93 7 50"
                fill="none"
                stroke="#c7a35a"
                strokeOpacity="0.26"
                strokeWidth="0.22"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                ref={orbitRef}
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="#e9dcb8"
                strokeOpacity="0.32"
                strokeWidth="0.16"
                strokeDasharray="3 8"
                strokeDashoffset="0"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>
        </div>

        <div className="-mt-5 flex flex-col items-center md:-mt-7">
          <span className="font-display text-xl tracking-[0.46em] text-champagne uppercase md:text-2xl">
            Xavier
          </span>
          <span className="mt-2 text-[8px] tracking-[0.58em] text-ink-faint uppercase md:text-[9px]">
            Vista sua presença
          </span>
        </div>

        <div className="mt-8 h-px w-56 overflow-hidden bg-white/10 md:w-64">
          <div
            className="h-full origin-left bg-gradient-to-r from-gold/60 via-gold-bright to-champagne transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${animatedProgress / 100})` }}
          />
        </div>

        <div className="mt-4 flex w-56 items-center justify-between md:w-64">
          <span className="text-[8px] tracking-[0.2em] text-ink-faint uppercase">Carregando experiência</span>
          <span className="text-[10px] tracking-[0.24em] text-[#e9dcb8] tabular-nums">
            {pct.toString().padStart(3, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
