import { SECTIONS, getSectionProgress } from "@/lib/frames";

interface MicroCTAProps {
  progress: number;
}

const MICRO_CTAS: Record<number, { text: string; href: string }> = {
  2: { text: "They built empires of knowledge. Help build the next one.", href: "/donate" },
  3: { text: "They carried the message across oceans. Carry it forward today.", href: "/programs" },
  5: { text: "They changed the world by example. Set yours today.", href: "/contact" },
  6: { text: "Across every border. Through every trial. The message endures.", href: "/donate" },
};

export default function MicroCTA({ progress }: MicroCTAProps) {
  return (
    <>
      {Object.entries(MICRO_CTAS).map(([sectionId, cta]) => {
        const section = SECTIONS[Number(sectionId) - 1];
        if (!section) return null;

        const { start, end } = getSectionProgress(section);
        const sectionDuration = end - start;

        // Show CTA in the last 30% of the section
        const ctaStart = end - sectionDuration * 0.3;
        const ctaFadeIn = ctaStart + sectionDuration * 0.05;

        let opacity = 0;
        if (progress >= ctaStart && progress <= end) {
          if (progress < ctaFadeIn) opacity = (progress - ctaStart) / (ctaFadeIn - ctaStart);
          else if (progress > end - sectionDuration * 0.05) opacity = (end - progress) / (sectionDuration * 0.05);
          else opacity = 1;
        }
        if (opacity <= 0) return null;

        return (
          <div
            key={sectionId}
            className="pointer-events-none fixed bottom-16 left-0 right-0 z-20 flex justify-center px-8"
            style={{ opacity }}
          >
            <a
              href={cta.href}
              className="pointer-events-auto rounded-sm border border-white/20 bg-black/30 px-6 py-3 text-sm tracking-wide text-white/80 backdrop-blur-sm transition-all hover:border-[#4AB3E2]/50 hover:text-white"
            >
              {cta.text}
            </a>
          </div>
        );
      })}
    </>
  );
}
