import { useRef, useState, useEffect } from "react";
import ScrollCanvas from "./ScrollCanvas";
import type { ScrollCanvasHandle } from "./ScrollCanvas";
import SectionOverlay from "./SectionOverlay";
import ScrollProgress from "./ScrollProgress";
import FallbackLayout from "./FallbackLayout";

export default function CinematicExperience() {
  const canvasRef = useRef<ScrollCanvasHandle>(null);
  const [progress, setProgress] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
  }, []);

  if (prefersReducedMotion || useFallback) {
    return <FallbackLayout />;
  }

  return (
    <main>
      <ScrollCanvas
        ref={canvasRef}
        onProgressChange={setProgress}
        onFallback={() => setUseFallback(true)}
      />
      <SectionOverlay progress={progress} />
      <ScrollProgress progress={progress} />

      {/* Floating nav — Bebas Neue, evenly spaced across top */}
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-30 flex items-center px-6 md:px-12 py-5">
        <a href="/" className="pointer-events-auto shrink-0">
          <img
            src="/salik-foundation-logo.png"
            alt="Salik Foundation"
            className="h-8 md:h-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          />
        </a>
        <div className="pointer-events-auto hidden flex-1 items-center justify-evenly md:flex" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <a
            href="/about"
            className="transition-all hover:text-white hover:scale-105"
            style={{
              color: "#C8A84E",
              fontSize: "1.4rem",
              letterSpacing: "0.12em",
              textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.6)",
            }}
          >
            About
          </a>
          <a
            href="/programs"
            className="transition-all hover:text-white hover:scale-105"
            style={{
              color: "#C8A84E",
              fontSize: "1.4rem",
              letterSpacing: "0.12em",
              textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.6)",
            }}
          >
            Programs
          </a>
          <a
            href="/contact"
            className="transition-all hover:text-white hover:scale-105"
            style={{
              color: "#C8A84E",
              fontSize: "1.4rem",
              letterSpacing: "0.12em",
              textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.6)",
            }}
          >
            Contact
          </a>
          <a
            href="https://www.canadahelps.org/en/charities/salik-foundation/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm border border-[#C8A84E]/50 bg-black/20 px-6 py-2 backdrop-blur-sm transition-all hover:bg-[#C8A84E]/20 hover:border-[#C8A84E] hover:scale-105"
            style={{
              color: "#C8A84E",
              fontSize: "1.4rem",
              letterSpacing: "0.12em",
              textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.6)",
            }}
          >
            Donate
          </a>
        </div>
      </div>
    </main>
  );
}
