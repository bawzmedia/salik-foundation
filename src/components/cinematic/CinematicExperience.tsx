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

      {/* Floating nav links — no bar, just text on screen */}
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4">
        <a href="/" className="pointer-events-auto">
          <img
            src="/salik-foundation-logo.png"
            alt="Salik Foundation"
            className="h-8 md:h-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          />
        </a>
        <div className="pointer-events-auto hidden items-center gap-6 text-sm tracking-[0.2em] uppercase md:flex" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          <a
            href="/about"
            className="transition-colors hover:text-white"
            style={{
              color: "#C8A84E",
              textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            About
          </a>
          <a
            href="/programs"
            className="transition-colors hover:text-white"
            style={{
              color: "#C8A84E",
              textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            Programs
          </a>
          <a
            href="/contact"
            className="transition-colors hover:text-white"
            style={{
              color: "#C8A84E",
              textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            Contact
          </a>
          <a
            href="https://www.canadahelps.org/en/charities/salik-foundation/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm border border-[#C8A84E]/50 bg-black/20 px-5 py-2 backdrop-blur-sm transition-all hover:bg-[#C8A84E]/20 hover:border-[#C8A84E]"
            style={{
              color: "#C8A84E",
              textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            Donate
          </a>
        </div>
      </div>
    </main>
  );
}
