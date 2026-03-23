import { useState, useEffect } from "react";

interface CinematicCloserProps {
  visible: boolean;
}

const LINES = [
  "Vikings answered the call.",
  "Emperors answered the call.",
  "Admirals answered the call.",
  "Scholars answered the call.",
  "Traders answered the call.",
];

export default function CinematicCloser({ visible }: CinematicCloserProps) {
  const [phase, setPhase] = useState(0); // 0=hidden, 1=dark, 2..6=lines, 7=question, 8=CTAs
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!visible) return;

    setOpacity(1);
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: dark screen
    timers.push(setTimeout(() => setPhase(1), 500));

    // Phases 2-6: each line
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setPhase(i + 2), 1500 + i * 1200));
    });

    // Phase 7: "Will you?"
    timers.push(setTimeout(() => setPhase(7), 1500 + LINES.length * 1200 + 800));

    // Phase 8: CTAs
    timers.push(setTimeout(() => setPhase(8), 1500 + LINES.length * 1200 + 2500));

    return () => timers.forEach(clearTimeout);
  }, [visible]);

  if (!visible && phase === 0) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black"
      style={{ opacity, transition: "opacity 1s ease-in-out" }}
    >
      <div className="max-w-2xl px-8 text-center">
        {/* Lines appearing one by one */}
        {LINES.map((line, i) => (
          <p
            key={i}
            className="mb-3 text-2xl font-light tracking-wide text-white/90 md:text-3xl"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              opacity: phase >= i + 2 ? 1 : 0,
              transform: phase >= i + 2 ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
            }}
          >
            {line}
          </p>
        ))}

        {/* "Will you?" */}
        <p
          className="mt-12 text-4xl font-light tracking-[0.15em] text-white md:text-6xl"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            opacity: phase >= 7 ? 1 : 0,
            transform: phase >= 7 ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
          }}
        >
          Will you?
        </p>

        {/* Logo + CTAs */}
        <div
          style={{
            opacity: phase >= 8 ? 1 : 0,
            transform: phase >= 8 ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 1s ease-out 0.3s, transform 1s ease-out 0.3s",
          }}
        >
          <img
            src="/salik-foundation-logo.png"
            alt="Salik Foundation"
            className="mx-auto mt-12 h-14"
          />

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/donate"
              className="rounded-sm border border-[#4AB3E2] bg-[#4AB3E2]/20 px-10 py-4 text-lg tracking-[0.2em] uppercase text-white shadow-[0_0_30px_rgba(74,179,226,0.3)] transition-all hover:bg-[#4AB3E2]/40 hover:shadow-[0_0_50px_rgba(74,179,226,0.5)]"
              style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
            >
              Answer the Call
            </a>
            <a
              href="/programs"
              className="rounded-sm border border-white/30 px-8 py-4 text-sm tracking-[0.2em] uppercase text-white/80 transition-all hover:border-white/60 hover:text-white"
            >
              Sponsor an Orphan
            </a>
            <a
              href="/contact"
              className="rounded-sm border border-white/30 px-8 py-4 text-sm tracking-[0.2em] uppercase text-white/80 transition-all hover:border-white/60 hover:text-white"
            >
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
