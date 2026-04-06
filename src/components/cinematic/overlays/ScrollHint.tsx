import { memo } from "react";

interface ScrollHintProps {
  visible: boolean;
}

const ScrollHint = memo(function ScrollHint({ visible }: ScrollHintProps) {
  return (
    <div
      className="fixed bottom-12 left-0 right-0 flex justify-center pointer-events-none"
      style={{
        zIndex: 10,
        opacity: visible ? 1 : 0,
        transition: "opacity 1.5s ease",
      }}
    >
      <div
        className="flex flex-col items-center select-none"
        style={{ animation: "cutsceneFloat 3s ease-in-out infinite" }}
      >
        {/* Horizontal lines flanking the text — HUD element */}
        <div className="flex items-center gap-5 mb-4">
          <div
            style={{
              width: "120px",
              height: "2px",
              background: "linear-gradient(to right, transparent, #E8D080)",
              boxShadow: "0 0 12px rgba(232,208,128,0.6)",
              animation: "lineGlow 2.5s ease-in-out infinite",
            }}
          />
          <span
            className="text-3xl md:text-4xl tracking-[0.5em] uppercase"
            style={{
              color: "#F0D878",
              fontFamily: "'Montserrat', 'Arial', sans-serif",
              fontWeight: 700,
              textShadow:
                "0 0 25px rgba(240,216,120,0.9), 0 0 50px rgba(240,216,120,0.5), 0 0 80px rgba(200,168,78,0.3), 0 2px 6px rgba(0,0,0,0.9)",
              animation: "textGlow 2.5s ease-in-out infinite",
            }}
          >
            Scroll
          </span>
          <div
            style={{
              width: "120px",
              height: "2px",
              background: "linear-gradient(to left, transparent, #E8D080)",
              boxShadow: "0 0 12px rgba(232,208,128,0.6)",
              animation: "lineGlow 2.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Animated chevron cascade */}
        <div className="flex flex-col items-center" style={{ gap: "3px" }}>
          <svg
            width="40"
            height="20"
            viewBox="0 0 40 20"
            fill="none"
            style={{
              animation: "chevronCascade 1.8s ease-in-out infinite",
              filter: "drop-shadow(0 0 12px rgba(240,216,120,0.8))",
            }}
          >
            <path
              d="M6 4L20 16L34 4"
              stroke="#F0D878"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            width="40"
            height="20"
            viewBox="0 0 40 20"
            fill="none"
            style={{
              animation: "chevronCascade 1.8s ease-in-out 0.2s infinite",
              filter: "drop-shadow(0 0 12px rgba(240,216,120,0.6))",
            }}
          >
            <path
              d="M6 4L20 16L34 4"
              stroke="#F0D878"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            width="40"
            height="20"
            viewBox="0 0 40 20"
            fill="none"
            style={{
              animation: "chevronCascade 1.8s ease-in-out 0.4s infinite",
              filter: "drop-shadow(0 0 12px rgba(240,216,120,0.4))",
            }}
          >
            <path
              d="M6 4L20 16L34 4"
              stroke="#F0D878"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
});

export default ScrollHint;
