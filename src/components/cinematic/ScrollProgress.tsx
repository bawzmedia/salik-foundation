import { SECTIONS, getSectionProgress } from "@/lib/frames";

interface ScrollProgressProps {
  progress: number;
  currentSection: number;
}

export default function ScrollProgress({ progress, currentSection }: ScrollProgressProps) {
  let opacity = 0;
  if (progress > 0.02 && progress < 0.95) {
    opacity = progress < 0.07 ? (progress - 0.02) / 0.05 : progress > 0.9 ? (0.95 - progress) / 0.05 : 1;
  }

  const section = SECTIONS[currentSection];
  const accent = section?.colorAccent || "#4AB3E2";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20"
      style={{ opacity }}
    >
      {/* Era dots */}
      <div className="flex justify-center gap-2 pb-2">
        {SECTIONS.map((s, i) => {
          const { end } = getSectionProgress(s);
          const isActive = i === currentSection;
          const isPast = progress >= end;
          return (
            <div
              key={s.id}
              className="h-1.5 w-1.5 rounded-full transition-all duration-500"
              style={{
                backgroundColor: isActive ? accent : isPast ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                transform: isActive ? "scale(1.5)" : "scale(1)",
              }}
            />
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="h-[2px]">
        <div
          className="h-full transition-[width] duration-100"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: accent,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}
