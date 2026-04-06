import { memo, forwardRef } from "react";

interface IntroOverlayProps {
  phase: "ummah" | "salik";
  initialOpacity: number;
}

const IntroOverlay = memo(
  forwardRef<HTMLDivElement, IntroOverlayProps>(function IntroOverlay(
    { phase, initialOpacity },
    ref
  ) {
    return (
      <div
        ref={ref}
        className="fixed inset-0 flex items-start justify-center pointer-events-none"
        style={{ zIndex: 8, opacity: initialOpacity, paddingTop: "8vh" }}
      >
        {phase === "ummah" && (
          <div className="flex flex-col items-center gap-4">
            <p
              className="text-base md:text-lg tracking-[0.4em] uppercase"
              style={{
                color: "#ffffff",
                fontFamily: "'Montserrat', 'Arial', sans-serif",
                fontWeight: 300,
                textShadow:
                  "0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)",
                letterSpacing: "0.4em",
              }}
            >
              Produced by
            </p>
            <img
              src="/ummah-media-logo.png"
              alt="Ummah Media Corporation"
              className="h-36 md:h-48"
              style={{
                filter: "drop-shadow(0 4px 30px rgba(0,0,0,0.8))",
              }}
            />
          </div>
        )}

        {phase === "salik" && (
          <div className="flex flex-col items-center">
            <img
              src="/salik-foundation-full-logo.png"
              alt="Salik Foundation"
              className="h-40 md:h-56"
              style={{
                filter: "drop-shadow(0 4px 30px rgba(0,0,0,0.8))",
              }}
            />
          </div>
        )}
      </div>
    );
  })
);

export default IntroOverlay;
