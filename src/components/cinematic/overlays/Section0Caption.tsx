import { memo } from "react";

interface Section0CaptionProps {
  dissolving: boolean;
  captionLines: number;
}

const Section0Caption = memo(function Section0Caption({
  dissolving,
  captionLines,
}: Section0CaptionProps) {
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center pointer-events-none ${dissolving ? "caption-dissolve" : ""}`}
      style={{ zIndex: 9, willChange: "opacity, transform" }}
    >
      <div className="caption-content text-center px-8 max-w-4xl flex flex-col items-center gap-2">
        <h2
          style={{
            color: "#FFFFFF",
            fontFamily: "'Bebas Neue', sans-serif",
            fontWeight: 400,
            fontSize: "clamp(3rem, 10vw, 8rem)",
            lineHeight: 0.95,
            letterSpacing: "0.04em",
            textShadow:
              "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
            opacity: captionLines >= 1 ? 1 : 0,
            transform: captionLines >= 1 ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 1.6s cubic-bezier(0.22, 1, 0.36, 1), transform 1.6s cubic-bezier(0.22, 1, 0.36, 1)",
            margin: 0,
          }}
        >
          500 Years
        </h2>
        <h2
          style={{
            color: "#FFFFFF",
            fontFamily: "'Bebas Neue', sans-serif",
            fontWeight: 400,
            fontSize: "clamp(3rem, 10vw, 8rem)",
            lineHeight: 0.95,
            letterSpacing: "0.04em",
            textShadow:
              "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
            opacity: captionLines >= 2 ? 1 : 0,
            transform: captionLines >= 2 ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 1.6s cubic-bezier(0.22, 1, 0.36, 1), transform 1.6s cubic-bezier(0.22, 1, 0.36, 1)",
            margin: 0,
          }}
        >
          Of Darkness
        </h2>
        <p
          className="mt-4"
          style={{
            color: "#F0D878",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
            textShadow:
              "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
            opacity: captionLines >= 3 ? 1 : 0,
            transform: captionLines >= 3 ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 2s cubic-bezier(0.22, 1, 0.36, 1), transform 2s cubic-bezier(0.22, 1, 0.36, 1)",
            letterSpacing: "0.15em",
          }}
        >
          No law. No scripture. No guidance.
        </p>
      </div>
    </div>
  );
});

export default Section0Caption;
