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
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 8, opacity: initialOpacity, willChange: "opacity" }}
      >
        {phase === "ummah" && (
          <div className="flex flex-col items-center gap-5">
            <p
              className="text-2xl md:text-3xl tracking-[0.3em] uppercase"
              style={{
                color: "#ffffff",
                fontFamily: "'Bebas Neue', sans-serif",
                fontWeight: 400,
                textShadow:
                  "0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)",
                letterSpacing: "0.3em",
              }}
            >
              Produced by
            </p>
            <img
              src="/ummah-media-logo.png"
              alt="Ummah Media Corporation"
              className="h-48 md:h-64"
              style={{
                filter: "drop-shadow(0 4px 40px rgba(0,0,0,0.9))",
              }}
            />
          </div>
        )}

        {phase === "salik" && (
          <div className="flex flex-col items-center">
            <img
              src="/salik-foundation-full-logo.png"
              alt="Salik Foundation"
              className="h-52 md:h-72"
              style={{
                filter: "drop-shadow(0 4px 40px rgba(0,0,0,0.9))",
              }}
            />
          </div>
        )}
      </div>
    );
  })
);

export default IntroOverlay;
