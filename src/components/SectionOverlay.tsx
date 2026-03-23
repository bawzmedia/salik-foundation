"use client";

import { SECTIONS, getSectionProgress } from "@/lib/frames";

interface SectionOverlayProps {
  progress: number;
}

export default function SectionOverlay({ progress }: SectionOverlayProps) {
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

        return (
          <div
            key={section.id}
            className="absolute px-8 text-center"
            style={{ opacity }}
          >
            <h2
              className="text-4xl tracking-[0.15em] text-white uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] md:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display), serif", fontWeight: 400 }}
            >
              {section.textOverlay}
            </h2>
          </div>
        );
      })}
    </div>
  );
}
