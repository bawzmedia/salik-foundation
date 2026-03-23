import { useState } from "react";
import ScrollCanvas from "./ScrollCanvas";
import EraOverlay from "./EraOverlay";
import ScrollProgress from "./ScrollProgress";
import MicroCTA from "./MicroCTA";
import CinematicCloser from "./CinematicCloser";
import FallbackLayout from "./FallbackLayout";

export default function CinematicExperience() {
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [showCloser, setShowCloser] = useState(false);

  // Detect reduced motion preference
  if (typeof window !== "undefined") {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return <FallbackLayout />;
  }

  if (useFallback) return <FallbackLayout />;

  return (
    <main>
      <ScrollCanvas
        onProgressChange={(p) => {
          setProgress(p);
          // Trigger closer at end of era 7
          if (p >= 0.98 && !showCloser) setShowCloser(true);
        }}
        onSectionChange={setCurrentSection}
        onFallback={() => setUseFallback(true)}
      />
      <EraOverlay progress={progress} currentSection={currentSection} />
      <MicroCTA progress={progress} />
      <ScrollProgress progress={progress} currentSection={currentSection} />
      <CinematicCloser visible={showCloser} />

      {/* Persistent navbar */}
      <nav className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4 backdrop-blur-sm bg-black/20">
        <a href="/">
          <img
            src="/salik-foundation-logo.png"
            alt="Salik Foundation"
            className="h-8 md:h-10"
          />
        </a>
        <div className="hidden items-center gap-6 text-sm tracking-wide text-white/70 md:flex">
          <a href="/about" className="transition-colors hover:text-white">About</a>
          <a href="/programs" className="transition-colors hover:text-white">Programs</a>
          <a href="/contact" className="transition-colors hover:text-white">Contact</a>
          <a
            href="/donate"
            className="rounded-sm border border-[#4AB3E2] bg-[#4AB3E2]/20 px-5 py-2 text-white shadow-[0_0_15px_rgba(74,179,226,0.2)] transition-all hover:bg-[#4AB3E2]/40 hover:shadow-[0_0_25px_rgba(74,179,226,0.4)]"
          >
            Donate
          </a>
        </div>
        {/* Mobile menu button */}
        <button
          className="text-white/70 md:hidden"
          aria-label="Open menu"
          onClick={() => {
            // Simple toggle — can enhance later
            const menu = document.getElementById("mobile-menu");
            if (menu) menu.classList.toggle("hidden");
          }}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className="fixed inset-0 z-40 hidden bg-black/95 backdrop-blur-md md:hidden"
      >
        <div className="flex h-full flex-col items-center justify-center gap-8">
          <a href="/about" className="text-2xl tracking-wide text-white/80 hover:text-white">About</a>
          <a href="/programs" className="text-2xl tracking-wide text-white/80 hover:text-white">Programs</a>
          <a href="/contact" className="text-2xl tracking-wide text-white/80 hover:text-white">Contact</a>
          <a
            href="/donate"
            className="mt-4 rounded-sm border border-[#4AB3E2] bg-[#4AB3E2]/20 px-10 py-4 text-xl tracking-[0.2em] uppercase text-white"
          >
            Donate
          </a>
          <button
            className="mt-8 text-white/50"
            onClick={() => {
              const menu = document.getElementById("mobile-menu");
              if (menu) menu.classList.add("hidden");
            }}
          >
            Close
          </button>
        </div>
      </div>
    </main>
  );
}
