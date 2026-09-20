"use client";

import { useEffect, useRef } from "react";
import { onScroll } from "animejs";
import { AnimeSplitTitle } from "@/components/ui/AnimeSplitTitle";

interface FeaturedPerfume {
  number: string;
  brand: string;
  name: string;
  line: string;
  video: string;
  poster?: string;
}

interface PerfumeScene {
  kicker: string;
  layout: "split" | "single";
  perfumes: readonly FeaturedPerfume[];
}

const PERFUME_SCENES: readonly PerfumeScene[] = [
  {
    kicker: "Ato I · Assinaturas intensas",
    layout: "split",
    perfumes: [
      {
        number: "01",
        brand: "Lattafa",
        name: "Asad Bourbon",
        line: "Doce. Intenso. Marcante.",
        video: "/videos/perfumes/asad-bourbon.mp4",
        poster: "/videos/perfumes/asad-bourbon-poster.jpg",
      },
      {
        number: "02",
        brand: "Lattafa",
        name: "Asad",
        line: "Intensidade que deixa presença.",
        video: "/videos/perfumes/asad-lattafa.mp4",
        poster: "/videos/perfumes/asad-lattafa-poster.jpg",
      },
    ],
  },
  {
    kicker: "Ato II · Contrastes",
    layout: "split",
    perfumes: [
      {
        number: "03",
        brand: "Lattafa",
        name: "Amethyst Fusion",
        line: "Rum. Âmbar. Baunilha.",
        video: "/videos/perfumes/arabian-purple.mp4",
      },
      {
        number: "04",
        brand: "Calvin Klein",
        name: "CK Be",
        line: "Presença sem excessos.",
        video: "/videos/perfumes/ck-be.mp4",
        poster: "/videos/perfumes/ck-be-poster.jpg",
      },
    ],
  },
  {
    kicker: "Ato III · O brilho final",
    layout: "single",
    perfumes: [
      {
        number: "05",
        brand: "Lattafa",
        name: "Fakhar Gold",
        line: "Luz. Impacto. Assinatura.",
        video: "/videos/perfumes/arabian-gold.mp4",
      },
    ],
  },
] as const;

const SCENE_OFFSETS = PERFUME_SCENES.map((_, sceneIndex) =>
  PERFUME_SCENES.slice(0, sceneIndex).reduce(
    (total, scene) => total + scene.perfumes.length,
    0,
  ),
);

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

function range(progress: number, start: number, end: number) {
  return clamp((progress - start) / (end - start));
}

/**
 * Three-act, full-screen perfume film controlled by scroll. Videos stay
 * paused: Anime.js tracks the section while each scroll position selects the
 * matching frame from all five product films.
 */
export function ArabicPerfumeScroll() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const introRef = useRef<HTMLDivElement | null>(null);
  const sceneRefs = useRef<Array<HTMLDivElement | null>>([]);
  const captionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const progressRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const intro = introRef.current;
    const progressBar = progressRef.current;
    const videos = videoRefs.current.filter(
      (video): video is HTMLVideoElement => video !== null,
    );

    if (!section || !stage || !intro || !progressBar || videos.length === 0) return;

    let disposed = false;
    let frameId = 0;
    let targetProgress = 0;
    let displayedProgress = 0;

    const paint = () => {
      if (disposed) return;

      const difference = targetProgress - displayedProgress;
      displayedProgress =
        Math.abs(difference) < 0.0005
          ? targetProgress
          : displayedProgress + difference * 0.18;

      const scenePosition = displayedProgress * PERFUME_SCENES.length;
      const activeScene = Math.min(
        Math.floor(scenePosition),
        PERFUME_SCENES.length - 1,
      );
      const introExit = range(displayedProgress, 0.015, 0.095);

      stage.dataset.scrollProgress = displayedProgress.toFixed(3);
      stage.dataset.activeScene = `${activeScene + 1}`;
      intro.style.opacity = `${1 - introExit}`;
      intro.style.transform = `translate3d(0, ${-2.5 * introExit}rem, 0) scale(${1 - introExit * 0.035})`;
      progressBar.style.transform = `scaleX(${displayedProgress})`;

      sceneRefs.current.forEach((sceneElement, sceneIndex) => {
        if (!sceneElement) return;
        const localProgress = scenePosition - sceneIndex;
        const enter = range(localProgress, -0.12, 0);
        const exit = 1 - range(localProgress, 0.88, 1);
        const opacity = enter * exit;

        sceneElement.style.opacity = `${opacity}`;
        sceneElement.style.visibility = opacity > 0.002 ? "visible" : "hidden";
        sceneElement.style.zIndex = sceneIndex === activeScene ? "10" : "5";
      });

      videos.forEach((video, perfumeIndex) => {
        const sceneIndex = Number(video.dataset.sceneIndex ?? 0);
        const sceneItemIndex = Number(video.dataset.sceneItemIndex ?? 0);
        const localProgress = clamp(scenePosition - sceneIndex);
        const duration = video.duration;

        if (Number.isFinite(duration) && duration > 0) {
          const videoOffset = sceneItemIndex === 0 ? 0 : 0.025;
          const videoProgress = range(localProgress, videoOffset, 0.965 + videoOffset);
          const nextTime = videoProgress * Math.max(duration - 0.04, 0);

          if (Math.abs(video.currentTime - nextTime) > 1 / 30) {
            video.currentTime = nextTime;
          }
          video.dataset.scrollTime = nextTime.toFixed(3);
        }

        const direction = sceneItemIndex === 0 ? -1 : 1;
        const scale = 1.085 - localProgress * 0.045;
        const drift = direction * (1 - range(localProgress, 0.28, 0.72)) * 1.4;
        video.style.transform = `translate3d(${drift}%, 0, 0) scale(${scale})`;

        const caption = captionRefs.current[perfumeIndex];
        if (caption) {
          const offset = sceneItemIndex === 0 ? 0 : 0.035;
          const reveal = range(localProgress, 0.12 + offset, 0.34 + offset);
          caption.style.opacity = `${reveal}`;
          caption.style.transform = `translate3d(0, ${(1 - reveal) * 2.25}rem, 0)`;
        }
      });

      if (Math.abs(targetProgress - displayedProgress) > 0.0005) {
        frameId = requestAnimationFrame(paint);
      } else {
        frameId = 0;
      }
    };

    const renderProgress = (progress: number) => {
      targetProgress = clamp(progress);
      if (!frameId) frameId = requestAnimationFrame(paint);
    };

    const handleMetadata = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      video.pause();
      renderProgress(targetProgress);
    };

    videos.forEach((video) => {
      video.pause();
      video.addEventListener("loadedmetadata", handleMetadata);
    });

    const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
    renderProgress(clamp(-section.getBoundingClientRect().top / travel));

    const scrollObserver = onScroll({
      target: section,
      enter: "start start",
      leave: "end end",
      onUpdate: (observer) => renderProgress(observer.progress),
    });

    return () => {
      disposed = true;
      scrollObserver.revert();
      if (frameId) cancelAnimationFrame(frameId);
      videos.forEach((video) => {
        video.pause();
        video.removeEventListener("loadedmetadata", handleMetadata);
      });
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="fragrancias"
      aria-labelledby="perfumes-arabes-title"
      className="relative h-[760svh]"
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-svh min-h-[620px] w-full overflow-hidden bg-[#030303]"
      >
        {PERFUME_SCENES.map((scene, sceneIndex) => (
          <div
            key={scene.kicker}
            ref={(element) => {
              sceneRefs.current[sceneIndex] = element;
            }}
            data-perfume-scene={sceneIndex + 1}
            className={`absolute inset-0 grid grid-cols-2 will-change-[opacity] ${
              sceneIndex === 0 ? "opacity-100" : "invisible opacity-0"
            }`}
          >
            {scene.perfumes.map((perfume, sceneItemIndex) => {
              const perfumeIndex = SCENE_OFFSETS[sceneIndex] + sceneItemIndex;
              const single = scene.layout === "single";

              return (
                <article
                  key={perfume.name}
                  className={`group relative min-w-0 overflow-hidden ${
                    single
                      ? "col-span-2"
                      : "border-r border-white/10 last:border-r-0"
                  }`}
                >
                  <video
                    ref={(element) => {
                      videoRefs.current[perfumeIndex] = element;
                    }}
                    data-scene-index={sceneIndex}
                    data-scene-item-index={sceneItemIndex}
                    src={perfume.video}
                    poster={perfume.poster}
                    muted
                    playsInline
                    preload="metadata"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full origin-center object-cover will-change-transform"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.36)_0%,transparent_35%,rgba(0,0,0,0.84)_100%)]" />
                  {!single && (
                    <div
                      className={`pointer-events-none absolute inset-0 ${
                        sceneItemIndex === 0
                          ? "bg-[linear-gradient(90deg,rgba(0,0,0,0.12),transparent_65%,rgba(0,0,0,0.32))]"
                          : "bg-[linear-gradient(90deg,rgba(0,0,0,0.32),transparent_35%,rgba(0,0,0,0.12))]"
                      }`}
                    />
                  )}

                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-24 sm:p-7 sm:pt-28 lg:p-10 lg:pt-28">
                    <span className="font-display text-xs tracking-[0.24em] text-champagne/80">
                      {perfume.number}
                    </span>
                    <span className="text-[8px] tracking-[0.32em] text-ink-muted uppercase sm:text-[9px]">
                      {perfume.brand}
                    </span>
                  </div>

                  <div
                    ref={(element) => {
                      captionRefs.current[perfumeIndex] = element;
                    }}
                    className={`absolute bottom-0 z-10 p-4 pb-20 opacity-0 will-change-transform sm:p-7 sm:pb-24 lg:p-10 lg:pb-24 ${
                      single ? "left-0 max-w-3xl" : "inset-x-0"
                    }`}
                  >
                    <p className="mb-3 text-[8px] tracking-[0.32em] text-champagne/70 uppercase sm:text-[9px]">
                      Seleção Xavier · {perfume.number}
                    </p>
                    <h3 className="max-w-[11ch] font-display text-[clamp(2rem,5vw,5.5rem)] leading-[0.82] text-ink">
                      {perfume.name}
                    </h3>
                    <p className="mt-4 max-w-xs text-[10px] leading-relaxed text-ink-muted sm:text-xs">
                      {perfume.line}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ))}

        <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_46%,rgba(200,164,93,0.12),transparent_30%),linear-gradient(90deg,rgba(0,0,0,0.16),transparent_20%,transparent_80%,rgba(0,0,0,0.16))]" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

        <div
          ref={introRef}
          data-arabic-intro
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-5 text-center will-change-transform"
        >
          <div className="max-w-4xl">
            <p className="eyebrow">Destaques · Cinco filmes</p>
            <AnimeSplitTitle
              id="perfumes-arabes-title"
              lines={["Presença que", "não passa", "despercebida."]}
              className="mt-5 font-display text-[clamp(2.7rem,7vw,6.5rem)] leading-[0.86] text-ink text-balance drop-shadow-[0_10px_35px_rgba(0,0,0,0.75)]"
            />
            <p className="mx-auto mt-5 max-w-lg text-xs leading-relaxed text-ink-muted sm:text-sm">
              Cinco fragrâncias. Três atos. Role para atravessar cada frame.
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 px-5 pb-7 sm:px-8 lg:px-12">
          <div className="mb-3 flex items-center justify-between text-[8px] tracking-[0.32em] text-ink-faint uppercase sm:text-[9px]">
            <span>Role para revelar</span>
            <span>05 filmes · 03 atos</span>
          </div>
          <div className="h-px w-full overflow-hidden bg-white/15">
            <span
              ref={progressRef}
              className="block h-full origin-left scale-x-0 bg-champagne will-change-transform"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
