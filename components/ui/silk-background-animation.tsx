"use client";

import { useEffect, useState } from "react";
import { SilkBackground } from "@/components/background/SilkBackground";

export const Component = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(2rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUpDelay {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInCorner {
          from {
            opacity: 0;
            transform: translateY(-1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out forwards;
        }

        .animate-fade-in-up-delay {
          animation: fadeInUpDelay 1s ease-out 0.3s forwards;
        }

        .animate-fade-in-corner {
          animation: fadeInCorner 1s ease-out 0.9s forwards;
        }
      `}</style>

      <div className="relative h-screen w-full overflow-hidden bg-black">
        {/* Animated Silk Background */}
        <SilkBackground tone="silk" className="absolute inset-0 h-full w-full" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        {/* Content */}
        <div className="relative z-20 flex h-full items-center justify-center">
          <div className="text-center px-8">
            {/* Main Title */}
            <h1
              className={`
                text-6xl sm:text-8xl md:text-9xl lg:text-[12rem] xl:text-[14rem] 
                font-light tracking-[-0.05em] leading-none
                text-white mix-blend-difference
                opacity-0
                ${isLoaded ? "animate-fade-in-up" : ""}
              `}
              style={{
                textShadow: "0 0 40px rgba(255, 255, 255, 0.1)",
              }}
            >
              silk
            </h1>

            {/* Subtitle */}
            <div
              className={`
                mt-8 text-lg md:text-xl lg:text-2xl 
                font-extralight tracking-[0.2em] uppercase
                text-gray-300/80 mix-blend-overlay
                opacity-0
                ${isLoaded ? "animate-fade-in-up-delay" : ""}
              `}
            >
              <span className="inline-block">flowing</span>
              <span className="mx-4 text-gray-500">•</span>
              <span className="inline-block">texture</span>
              <span className="mx-4 text-gray-500">•</span>
              <span className="inline-block">art</span>
            </div>
          </div>
        </div>

        {/* Corner Accent */}
        <div
          className={`
            absolute top-8 left-8 z-30
            text-xs font-light tracking-widest uppercase
            text-gray-500/40 mix-blend-overlay
            opacity-0
            ${isLoaded ? "animate-fade-in-corner" : ""}
          `}
        >
          2025
        </div>
      </div>
    </>
  );
};