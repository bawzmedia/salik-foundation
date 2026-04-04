import { memo } from "react";
import { SECTIONS, getSectionProgress } from "@/lib/frames";

interface SectionOverlayProps {
  progress: number;
}

export default memo(function SectionOverlay({ progress }: SectionOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
      {SECTIONS.map((section) => {
        if (!section.textOverlay) return null;

        const { start, end } = getSectionProgress(section);
        const sectionDuration = end - start;

        const fadeInEnd = start + sectionDuration * 0.2;
        const fadeOutStart = end - sectionDuration * 0.2;

        let opacity = 0;
        if (progress >= start && progress <= end) {
          if (progress < fadeInEnd) {
            opacity = (progress - start) / (fadeInEnd - start);
          } else if (progress > fadeOutStart) {
            opacity = (end - progress) / (end - fadeOutStart);
          } else {
            opacity = 1;
          }
        }

        if (opacity <= 0) return null;

        // Support multi-line text (split by \n)
        const lines = section.textOverlay.split("\n");

        return (
          <div
            key={section.id}
            className="absolute max-w-3xl px-8 text-center"
            style={{ opacity }}
          >
            {lines.map((line, i) => (
              <p
                key={i}
                className={`${
                  i === 0
                    ? "text-3xl md:text-5xl lg:text-6xl"
                    : "mt-4 text-lg md:text-xl lg:text-2xl text-white/80"
                } font-light tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]`}
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {line}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
});
