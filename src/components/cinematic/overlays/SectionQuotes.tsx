import { memo, forwardRef } from "react";

interface SectionQuotesProps {
  sectionIndex: number;
  dissolving: boolean;
  initialFade: number;
}

const SectionQuotes = memo(
  forwardRef<HTMLDivElement, SectionQuotesProps>(function SectionQuotes(
    { sectionIndex, dissolving, initialFade },
    ref
  ) {
    return (
      <div
        className={`fixed inset-0 pointer-events-none ${dissolving ? "caption-dissolve" : ""}`}
        style={{ zIndex: 9 }}
      >
        {/* Section 1 — THEY BOWED TO STONE */}
        {sectionIndex === 1 && (
          <div
            ref={ref}
            className="absolute top-0 left-0 right-0 px-6 md:px-0 md:left-[25vw] md:right-auto"
            style={{
              paddingTop: "8vh",
              maxWidth: "650px",
              willChange: "opacity, transform",
              opacity: dissolving ? undefined : initialFade,
              transform: dissolving
                ? undefined
                : `translateY(${(1 - initialFade) * 15}px)`,
            }}
          >
            <h2
              style={{
                color: "#FFFFFF",
                fontFamily: "'Bebas Neue', sans-serif",
                fontWeight: 400,
                fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
                lineHeight: 0.95,
                letterSpacing: "0.04em",
                textAlign: "left",
                textShadow:
                  "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                margin: 0,
              }}
            >
              They Bowed
              <br />
              To Stone
            </h2>
            <p
              className="mt-4"
              style={{
                color: "#F0D878",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(0.9rem, 2vw, 1.3rem)",
                textAlign: "left",
                textShadow:
                  "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                lineHeight: 1.5,
              }}
            >
              &ldquo;Do you call upon Baal and abandon the Best of Creators
              &mdash; Allah, your Lord and the Lord of your
              forefathers?&rdquo;
            </p>
            <p
              className="mt-2 text-xs md:text-sm tracking-[0.2em] uppercase"
              style={{
                color: "rgba(240,216,120,0.4)",
                fontFamily: "'Montserrat', 'Arial', sans-serif",
                fontWeight: 300,
                textAlign: "left",
                textShadow: "0 2px 20px rgba(0,0,0,0.9)",
              }}
            >
              Qur&rsquo;an 37:125-126
            </p>
          </div>
        )}

        {/* Section 2 — ALLAH'S MERCY SENT LIGHT */}
        {sectionIndex === 2 && (
          <div
            ref={ref}
            className="flex flex-col items-center pt-[2vh] px-6"
            style={{
              willChange: "opacity, transform",
              opacity: dissolving ? undefined : initialFade,
              transform: dissolving
                ? undefined
                : `translateY(${(1 - initialFade) * 20}px)`,
            }}
          >
            <img
              src="/quran-open.webp"
              alt="The Holy Qur'an"
              className="h-48 md:h-64 lg:h-80 mb-6"
              style={{
                filter:
                  "drop-shadow(0 0 40px rgba(200,168,78,0.4)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))",
              }}
            />
            <h2
              style={{
                color: "#FFFFFF",
                fontFamily: "'Bebas Neue', sans-serif",
                fontWeight: 400,
                fontSize: "clamp(2.5rem, 8vw, 6rem)",
                lineHeight: 0.95,
                letterSpacing: "0.04em",
                textShadow:
                  "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                margin: 0,
                textAlign: "center",
              }}
            >
              Allah&rsquo;s Mercy
              <br />
              Sent Light
            </h2>
            <p
              className="mt-4"
              style={{
                color: "#F0D878",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(0.9rem, 2vw, 1.3rem)",
                textShadow:
                  "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                lineHeight: 1.7,
                textAlign: "center",
                maxWidth: "600px",
                padding: "0 2rem",
              }}
            >
              &ldquo;A Book sent down to bring mankind out of darkness and
              into light.&rdquo;
            </p>
            <p
              className="mt-2 text-xs md:text-sm tracking-[0.3em] uppercase"
              style={{
                color: "rgba(240,216,120,0.4)",
                fontFamily: "'Montserrat', 'Arial', sans-serif",
                fontWeight: 300,
                textShadow: "0 2px 20px rgba(0,0,0,0.9)",
              }}
            >
              Qur&rsquo;an 14:1
            </p>
          </div>
        )}

        {/* Section 3 — EVERYTHING CHANGED */}
        {sectionIndex === 3 && (
          <div
            ref={ref}
            className="flex flex-col items-center justify-center px-6"
            style={{
              height: "100dvh",
              willChange: "opacity, transform",
              opacity: dissolving ? undefined : initialFade,
              transform: dissolving
                ? undefined
                : `translateY(${(1 - initialFade) * 20}px)`,
            }}
          >
            <h2
              style={{
                color: "#FFFFFF",
                fontFamily: "'Bebas Neue', sans-serif",
                fontWeight: 400,
                fontSize: "clamp(3.5rem, 12vw, 9rem)",
                lineHeight: 0.95,
                letterSpacing: "0.04em",
                textShadow:
                  "0 0 50px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                margin: 0,
                textAlign: "center",
              }}
            >
              Everything
              <br />
              Changed
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
                textAlign: "center",
                letterSpacing: "0.1em",
                maxWidth: "600px",
                padding: "0 1rem",
              }}
            >
              One revelation. One message. One God.
            </p>
          </div>
        )}

        {/* Section 4 — THE WORLD LISTENED */}
        {sectionIndex === 4 && (
          <div
            ref={ref}
            className="flex flex-col items-center justify-center px-6"
            style={{
              height: "100dvh",
              willChange: "opacity, transform",
              opacity: dissolving ? undefined : initialFade,
              transform: dissolving
                ? undefined
                : `translateY(${(1 - initialFade) * 20}px)`,
            }}
          >
            <h2
              style={{
                color: "#FFFFFF",
                fontFamily: "'Bebas Neue', sans-serif",
                fontWeight: 400,
                fontSize: "clamp(3rem, 10vw, 8rem)",
                lineHeight: 0.95,
                letterSpacing: "0.04em",
                textShadow:
                  "0 0 50px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                margin: 0,
                textAlign: "center",
              }}
            >
              The World
              <br />
              Listened
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
                textAlign: "center",
                letterSpacing: "0.08em",
                maxWidth: "600px",
                padding: "0 2rem",
              }}
            >
              The message crossed every ocean, every mountain, every border.
            </p>
          </div>
        )}
      </div>
    );
  })
);

export default SectionQuotes;
