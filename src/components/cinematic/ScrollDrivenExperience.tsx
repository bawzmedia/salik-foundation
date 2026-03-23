import { useEffect, useRef, useState } from "react";
import { ERAS } from "@/lib/frames";

const ERA_BACKGROUNDS: Record<number, string> = {
  1: "radial-gradient(ellipse at 30% 40%, #2a3a4a 0%, #0d1b2a 40%, #050a12 100%)", // ice/fjord
  2: "radial-gradient(ellipse at 50% 50%, #4a3520 0%, #2a1a08 40%, #0a0600 100%)", // gold/sahara
  3: "radial-gradient(ellipse at 60% 40%, #1a3a2a 0%, #0d2018 40%, #050a08 100%)", // jade/silk
  4: "radial-gradient(ellipse at 40% 60%, #3a2218 0%, #1a0e08 40%, #080402 100%)", // terracotta
  5: "radial-gradient(ellipse at 50% 30%, #0a2a2a 0%, #051818 40%, #020a0a 100%)", // ocean/tropical
  6: "radial-gradient(ellipse at 50% 50%, #2a2218 0%, #1a1408 40%, #0a0800 100%)", // sepia
  7: "radial-gradient(ellipse at 50% 50%, #0a1e2e 0%, #081828 40%, #040a12 100%)", // salik blue
};

export default function ScrollDrivenExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentEra, setCurrentEra] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [textPhases, setTextPhases] = useState<Record<number, number>>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollTop / docHeight, 1);
      setScrollProgress(progress);

      // Eras use first 78% of scroll, closer uses remaining 22%
      const eraScrollEnd = docHeight * 0.78;
      const eraHeight = eraScrollEnd / ERAS.length;
      const eraIndex = Math.min(Math.floor(scrollTop / eraHeight), ERAS.length - 1);
      setCurrentEra(eraIndex);

      // Calculate text phases for each section
      const phases: Record<number, number> = {};
      ERAS.forEach((section, i) => {
        const sectionStart = i * eraHeight;
        const sectionEnd = (i + 1) * eraHeight;
        if (scrollTop >= sectionStart && scrollTop <= sectionEnd) {
          phases[i] = (scrollTop - sectionStart) / (sectionEnd - sectionStart);
        } else if (scrollTop > sectionEnd) {
          phases[i] = 1;
        } else {
          phases[i] = 0;
        }
      });
      setTextPhases(phases);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate closer visibility — starts at 80% scroll, fills to 100%
  const closerProgress = Math.max(0, (scrollProgress - 0.80) / 0.20);

  return (
    <div ref={containerRef}>
      {/* Scroll spacer — each era gets 100vh + extra for closer */}
      <div style={{ height: `${(ERAS.length + 2) * 100}vh` }} />

      {/* Fixed viewport layer */}
      <div className="fixed inset-0 z-0">
        {/* Background layers with crossfade */}
        {ERAS.map((section, i) => {
          const phase = textPhases[i] || 0;
          let bgOpacity = 0;
          if (i === currentEra) {
            bgOpacity = 1;
          } else if (i === currentEra - 1 && (textPhases[currentEra] || 0) < 0.15) {
            bgOpacity = 1 - (textPhases[currentEra] || 0) / 0.15;
          }

          return (
            <div
              key={`bg-${section.eraNumber}`}
              className="absolute inset-0 transition-opacity duration-700"
              style={{
                background: ERA_BACKGROUNDS[section.eraNumber],
                opacity: bgOpacity,
              }}
            />
          );
        })}

        {/* Persistent navbar */}
        <nav className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4 backdrop-blur-sm bg-black/20">
          <a href="/">
            <img src="/salik-foundation-logo.png" alt="Salik Foundation" className="h-8 md:h-10" />
          </a>
          <div className="hidden items-center gap-6 text-sm tracking-wide text-white/70 md:flex">
            <a href="/about" className="transition-colors hover:text-white">About</a>
            <a href="/programs" className="transition-colors hover:text-white">Programs</a>
            <a href="/contact" className="transition-colors hover:text-white">Contact</a>
            <a
              href="/donate"
              className="rounded-sm border border-[#4AB3E2] bg-[#4AB3E2]/20 px-5 py-2 text-white shadow-[0_0_15px_rgba(74,179,226,0.2)] transition-all hover:bg-[#4AB3E2]/40"
            >
              Donate
            </a>
          </div>
          <button
            className="text-white/70 md:hidden"
            aria-label="Open menu"
            onClick={() => document.getElementById("sf-mobile-menu")?.classList.toggle("hidden")}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </nav>

        {/* Mobile menu */}
        <div id="sf-mobile-menu" className="fixed inset-0 z-50 hidden bg-black/95 backdrop-blur-md md:hidden">
          <div className="flex h-full flex-col items-center justify-center gap-8">
            <a href="/about" className="text-2xl tracking-wide text-white/80">About</a>
            <a href="/programs" className="text-2xl tracking-wide text-white/80">Programs</a>
            <a href="/contact" className="text-2xl tracking-wide text-white/80">Contact</a>
            <a href="/donate" className="mt-4 rounded-sm border border-[#4AB3E2] bg-[#4AB3E2]/20 px-10 py-4 text-xl uppercase text-white">Donate</a>
            <button className="mt-8 text-white/50" onClick={() => document.getElementById("sf-mobile-menu")?.classList.add("hidden")}>Close</button>
          </div>
        </div>

        {/* Era indicator (top-left) */}
        {ERAS.map((section, i) => {
          const phase = textPhases[i] || 0;
          let opacity = 0;
          if (i === currentEra && phase > 0.05 && phase < 0.95) {
            opacity = phase < 0.15 ? (phase - 0.05) / 0.1 : phase > 0.85 ? (0.95 - phase) / 0.1 : 1;
            opacity *= 0.6;
          }
          if (opacity <= 0) return null;

          return (
            <div
              key={`era-ind-${section.eraNumber}`}
              className="absolute left-8 top-24 z-20"
              style={{ opacity }}
            >
              <div className="text-xs tracking-[0.3em] uppercase" style={{ color: section.colorAccent }}>
                Era {section.eraNumber} of 7
              </div>
              <div className="mt-1 text-sm font-light tracking-wide text-white/70">
                {section.era}
              </div>
            </div>
          );
        })}

        {/* Text overlays (center) */}
        {ERAS.map((section, i) => {
          if (!section.textOverlay) return null;
          const phase = textPhases[i] || 0;

          let opacity = 0;
          if (phase > 0.08 && phase < 0.92) {
            if (phase < 0.2) opacity = (phase - 0.08) / 0.12;
            else if (phase > 0.8) opacity = (0.92 - phase) / 0.12;
            else opacity = 1;
          }
          if (opacity <= 0) return null;

          // Stagger lines
          const lineDelay = 0.15;

          return (
            <div
              key={`text-${section.eraNumber}`}
              className="absolute inset-0 z-10 flex items-center justify-center px-8"
            >
              <div className="max-w-3xl text-center">
                {/* Era title */}
                <div
                  className="mb-6 text-xs tracking-[0.4em] uppercase md:text-sm"
                  style={{
                    color: section.colorAccent,
                    opacity: Math.min(1, Math.max(0, (phase - 0.05) / 0.1)),
                    transform: `translateY(${Math.max(0, (1 - Math.min(1, (phase - 0.05) / 0.1))) * 20}px)`,
                    transition: "transform 0.1s ease-out",
                  }}
                >
                  {section.name}
                </div>

                {section.textOverlay.map((line, lineIdx) => {
                  const linePhase = Math.max(0, Math.min(1, (phase - 0.1 - lineIdx * lineDelay) / 0.15));
                  const fadeOutPhase = phase > 0.75 ? Math.max(0, 1 - (phase - 0.75) / 0.15) : 1;

                  return (
                    <p
                      key={lineIdx}
                      className={`${
                        lineIdx === 0
                          ? "text-2xl md:text-4xl lg:text-5xl"
                          : "mt-4 text-lg md:text-xl lg:text-2xl text-white/80"
                      } font-light tracking-wide text-white`}
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        opacity: linePhase * fadeOutPhase,
                        transform: `translateY(${(1 - linePhase) * 30}px)`,
                      }}
                    >
                      {line}
                    </p>
                  );
                })}

                {/* Decorative line */}
                <div
                  className="mx-auto mt-8 h-px"
                  style={{
                    backgroundColor: section.colorAccent,
                    opacity: opacity * 0.3,
                    width: `${Math.min(120, phase * 200)}px`,
                    transition: "width 0.3s ease-out",
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Micro CTAs */}
        {[2, 3, 5, 6].map((sectionId) => {
          const section = ERAS[sectionId - 1];
          const phase = textPhases[sectionId - 1] || 0;
          const ctaTexts: Record<number, { text: string; href: string }> = {
            2: { text: "They built empires of knowledge. Help build the next one.", href: "/donate" },
            3: { text: "They carried the message across oceans. Carry it forward today.", href: "/programs" },
            5: { text: "They changed the world by example. Set yours today.", href: "/contact" },
            6: { text: "Across every border. Through every trial. The message endures.", href: "/donate" },
          };
          const cta = ctaTexts[sectionId];
          if (!cta) return null;

          let opacity = 0;
          if (phase > 0.6 && phase < 0.9) {
            if (phase < 0.65) opacity = (phase - 0.6) / 0.05;
            else if (phase > 0.85) opacity = (0.9 - phase) / 0.05;
            else opacity = 1;
          }
          if (opacity <= 0) return null;

          return (
            <div
              key={`cta-${sectionId}`}
              className="absolute bottom-20 left-0 right-0 z-20 flex justify-center px-8"
              style={{ opacity }}
            >
              <a
                href={cta.href}
                className="rounded-sm border border-white/20 bg-black/30 px-6 py-3 text-sm tracking-wide text-white/80 backdrop-blur-sm transition-all hover:border-[#4AB3E2]/50 hover:text-white"
              >
                {cta.text}
              </a>
            </div>
          );
        })}

        {/* Scroll progress dots + bar */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20"
          style={{ opacity: scrollProgress > 0.02 && scrollProgress < 0.95 ? 1 : 0, transition: "opacity 0.5s" }}
        >
          <div className="flex justify-center gap-2 pb-2">
            {ERAS.map((s, i) => {
              const isActive = i === currentEra;
              const isPast = (textPhases[i] || 0) >= 0.95;
              return (
                <div
                  key={s.eraNumber}
                  className="h-1.5 w-1.5 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: isActive ? s.colorAccent : isPast ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                    transform: isActive ? "scale(1.5)" : "scale(1)",
                  }}
                />
              );
            })}
          </div>
          <div className="h-[2px]">
            <div
              className="h-full transition-[width] duration-100"
              style={{
                width: `${scrollProgress * 100}%`,
                backgroundColor: ERAS[currentEra]?.colorAccent || "#4AB3E2",
                opacity: 0.6,
              }}
            />
          </div>
        </div>

        {/* Cinematic Closer */}
        {closerProgress > 0 && <Closer progress={closerProgress} />}
      </div>
    </div>
  );
}

// ── Cinematic Closer ──
const CLOSER_LINES = [
  "Vikings answered the call.",
  "Emperors answered the call.",
  "Admirals answered the call.",
  "Scholars answered the call.",
  "Traders answered the call.",
];

function Closer({ progress }: { progress: number }) {
  // Map progress 0→1 across the whole closer sequence
  const lineCount = CLOSER_LINES.length;
  const lineSlice = 0.5 / lineCount; // first 50% for lines
  const questionStart = 0.55;
  const ctaStart = 0.7;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black"
      style={{ opacity: Math.min(1, progress * 3) }}
    >
      <div className="max-w-2xl px-8 text-center">
        {CLOSER_LINES.map((line, i) => {
          const lineProgress = Math.max(0, Math.min(1, (progress - i * lineSlice) / lineSlice));
          return (
            <p
              key={i}
              className="mb-3 text-2xl font-light tracking-wide text-white/90 md:text-3xl"
              style={{
                fontFamily: "Georgia, serif",
                opacity: lineProgress,
                transform: `translateY(${(1 - lineProgress) * 15}px)`,
              }}
            >
              {line}
            </p>
          );
        })}

        <p
          className="mt-12 text-4xl font-light tracking-[0.15em] text-white md:text-6xl"
          style={{
            fontFamily: "Georgia, serif",
            opacity: Math.max(0, Math.min(1, (progress - questionStart) / 0.1)),
            transform: `translateY(${Math.max(0, (1 - Math.max(0, (progress - questionStart) / 0.1))) * 20}px)`,
          }}
        >
          Will you?
        </p>

        <div
          style={{
            opacity: Math.max(0, Math.min(1, (progress - ctaStart) / 0.15)),
            transform: `translateY(${Math.max(0, (1 - Math.max(0, (progress - ctaStart) / 0.15))) * 20}px)`,
          }}
        >
          <img src="/salik-foundation-logo.png" alt="Salik Foundation" className="mx-auto mt-12 h-14" />

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/donate"
              className="rounded-sm border border-[#4AB3E2] bg-[#4AB3E2]/20 px-10 py-4 text-lg tracking-[0.2em] uppercase text-white shadow-[0_0_30px_rgba(74,179,226,0.3)] transition-all hover:bg-[#4AB3E2]/40 hover:shadow-[0_0_50px_rgba(74,179,226,0.5)]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Answer the Call
            </a>
            <a href="/programs" className="rounded-sm border border-white/30 px-8 py-4 text-sm tracking-[0.2em] uppercase text-white/80 transition-all hover:border-white/60 hover:text-white">
              Sponsor an Orphan
            </a>
            <a href="/contact" className="rounded-sm border border-white/30 px-8 py-4 text-sm tracking-[0.2em] uppercase text-white/80 transition-all hover:border-white/60 hover:text-white">
              Join the Chain
            </a>
          </div>

          <p className="mt-8 text-sm tracking-wide text-white/40">
            Guided by the Qur'an. Serving Humanity.
          </p>
        </div>
      </div>
    </div>
  );
}
