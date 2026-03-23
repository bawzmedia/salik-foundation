import { SECTIONS, getSectionProgress } from "@/lib/frames";

interface EraOverlayProps {
  progress: number;
  currentSection: number;
}

export default function EraOverlay({ progress, currentSection }: EraOverlayProps) {
  return (
    <>
      {/* Era indicator (top-left) */}
      {SECTIONS.map((section, idx) => {
        if (idx !== currentSection) return null;
        const { start, end } = getSectionProgress(section);
        const sectionDuration = end - start;
        const fadeInEnd = start + sectionDuration * 0.15;
        const fadeOutStart = end - sectionDuration * 0.15;

        let opacity = 0;
        if (progress >= start && progress <= end) {
          if (progress < fadeInEnd) opacity = (progress - start) / (fadeInEnd - start);
          else if (progress > fadeOutStart) opacity = (end - progress) / (end - fadeOutStart);
          else opacity = 1;
        }
        if (opacity <= 0) return null;

        return (
          <div
            key={`era-${section.id}`}
            className="pointer-events-none fixed left-8 top-24 z-20"
            style={{ opacity: opacity * 0.6 }}
          >
            <div
              className="text-xs tracking-[0.3em] uppercase"
              style={{ color: section.colorAccent }}
            >
              Era {section.id} of 7
            </div>
            <div className="mt-1 text-sm font-light tracking-wide text-white/70">
              {section.era}
            </div>
          </div>
        );
      })}

      {/* Text overlays (center) */}
      {SECTIONS.map((section) => {
        if (!section.textOverlay) return null;
        const { start, end } = getSectionProgress(section);
        const sectionDuration = end - start;
        const fadeInEnd = start + sectionDuration * 0.2;
        const fadeOutStart = end - sectionDuration * 0.2;

        let opacity = 0;
        if (progress >= start && progress <= end) {
          if (progress < fadeInEnd) opacity = (progress - start) / (fadeInEnd - start);
          else if (progress > fadeOutStart) opacity = (end - progress) / (end - fadeOutStart);
          else opacity = 1;
        }
        if (opacity <= 0) return null;

        return (
          <div
            key={section.id}
            className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-8"
            style={{ opacity }}
          >
            <div className="max-w-3xl text-center">
              {section.textOverlay.map((line, i) => (
                <p
                  key={i}
                  className={`${
                    i === 0
                      ? "text-3xl md:text-5xl lg:text-6xl"
                      : "mt-4 text-xl md:text-2xl lg:text-3xl text-white/80"
                  } font-light tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]`}
                  style={{
                    fontFamily: "var(--font-display, Georgia, serif)",
                    opacity: i === 0 ? 1 : 0.85,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
