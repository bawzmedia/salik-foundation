import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from "react";
import { useFrameLoader } from "@/hooks/useFrameLoader";
import { TOTAL_FRAMES, FLASH_FRAME_COUNT, SECTIONS } from "@/lib/frames";

export interface ScrollCanvasHandle {
  playFlashSequence: () => Promise<void>;
}

interface ScrollCanvasProps {
  onProgressChange?: (progress: number) => void;
  onFallback?: () => void;
}

const ScrollCanvas = forwardRef<ScrollCanvasHandle, ScrollCanvasProps>(
  function ScrollCanvas({ onProgressChange, onFallback }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const currentFrameRef = useRef(0);
    const isFlashingRef = useRef(false);
    const isPlayingRef = useRef(false);
    const currentSectionRef = useRef(0);
    const [currentSection, setCurrentSection] = useState(0);
    const [showScrollHint, setShowScrollHint] = useState(false);
    const [introPhase, setIntroPhase] = useState<"none" | "ummah" | "salik" | "done">("none");
    const [introOpacity, setIntroOpacity] = useState(0);
    const [showHadith, setShowHadith] = useState(false);
    const [hadithDissolving, setHadithDissolving] = useState(false);
    const [captionLines, setCaptionLines] = useState<number>(0); // 0-3 lines visible
    const scrollCooldownRef = useRef(false);
    const idleLoopRef = useRef<number | null>(null);

    const { frames, flashFrames, isInitialLoadComplete, isFallback, updateCurrentFrame } =
      useFrameLoader();

    useEffect(() => {
      if (isFallback && onFallback) onFallback();
    }, [isFallback, onFallback]);

    // Draw a frame to the canvas with cover crop behavior (Retina-aware)
    const drawFrame = useCallback((img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displayW = canvas.width / dpr;
      const displayH = canvas.height / dpr;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      const scale = Math.max(displayW / imgW, displayH / imgH);
      const sw = displayW / scale;
      const sh = displayH / scale;
      const sx = (imgW - sw) / 2;
      const sy = (imgH - sh) / 2;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }, []);

    // Draw frame at given index (hold last loaded if target isn't ready)
    const drawFrameAtIndex = useCallback(
      (index: number) => {
        let frameImg = frames.current[index];
        if (!frameImg) {
          for (let i = index - 1; i >= 0; i--) {
            if (frames.current[i]) {
              frameImg = frames.current[i];
              break;
            }
          }
        }
        if (frameImg) drawFrame(frameImg);
      },
      [frames, drawFrame]
    );

    // Resize canvas to match viewport
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const idx = currentFrameRef.current;
      let frameImg = frames.current[idx];
      if (!frameImg) {
        for (let i = idx - 1; i >= 0; i--) {
          if (frames.current[i]) { frameImg = frames.current[i]; break; }
        }
      }
      if (frameImg) drawFrame(frameImg);
    }, [drawFrame, frames]);

    useEffect(() => {
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }, [resizeCanvas]);

    // Stop idle loop
    const stopIdleLoop = useCallback(() => {
      if (idleLoopRef.current !== null) {
        cancelAnimationFrame(idleLoopRef.current);
        idleLoopRef.current = null;
      }
    }, []);

    // Play a section's frames as a video clip at 24fps
    const playSection = useCallback(
      (sectionIndex: number, reverse: boolean = false): Promise<void> => {
        return new Promise((resolve) => {
          if (sectionIndex < 0 || sectionIndex >= SECTIONS.length) { resolve(); return; }
          if (isPlayingRef.current || isFlashingRef.current) { resolve(); return; }

          stopIdleLoop();
          isPlayingRef.current = true;
          setShowScrollHint(false);
          // Dissolve captions when scrolling forward away from section 0
          if (showHadith && sectionIndex > 0 && !reverse) {
            setHadithDissolving(true);
            setTimeout(() => {
              setShowHadith(false);
              setHadithDissolving(false);
              setCaptionLines(0);
            }, 1500);
          }
          // Clear captions immediately when scrolling back to section 0
          // (the frame-driven logic will re-show them at the right frames)
          if (sectionIndex === 0 && reverse) {
            setHadithDissolving(false);
          }
          const section = SECTIONS[sectionIndex];
          const startFrame = section.startFrame - 1; // 0-indexed
          const endFrame = section.endFrame - 1; // 0-indexed

          let frameIdx = reverse ? endFrame : startFrame;
          const FPS_INTERVAL = 1000 / 24;
          let lastTime = performance.now();

          // Preload frames for this section
          for (let i = startFrame; i <= endFrame; i++) {
            updateCurrentFrame(i);
          }

          const playNext = (now: number) => {
            const done = reverse ? frameIdx < startFrame : frameIdx > endFrame;
            if (done) {
              isPlayingRef.current = false;
              currentSectionRef.current = sectionIndex;
              setCurrentSection(sectionIndex);

              const progress = reverse
                ? (section.startFrame - 1) / TOTAL_FRAMES
                : section.endFrame / TOTAL_FRAMES;
              onProgressChange?.(progress);

              // Section 0 completion — depends on direction
              if (sectionIndex === 0) {
                if (reverse) {
                  // Scrolled back to beginning — show ummah logo at frame 0
                  setIntroPhase("ummah");
                  setIntroOpacity(0);
                  setShowHadith(false);
                  setCaptionLines(0);
                } else {
                  // Played forward to end — captions fully visible
                  setIntroPhase("done");
                  setIntroOpacity(0);
                  setShowHadith(true);
                  setCaptionLines(3);
                }
              }

              // Show scroll hint unless we're on the last section
              if (sectionIndex < SECTIONS.length - 1) {
                setShowScrollHint(true);
              }

              resolve();
              return;
            }

            const elapsed = now - lastTime;
            if (elapsed >= FPS_INTERVAL) {
              lastTime = now - (elapsed % FPS_INTERVAL);
              currentFrameRef.current = frameIdx;
              drawFrameAtIndex(frameIdx);

              // Drive intro overlays during section 0 (clip 1+2)
              // Works identically forward and reverse — frame position determines state
              if (sectionIndex === 0) {
                const f = frameIdx; // 0-indexed frame

                // Logos
                if (f < 10) {
                  setIntroPhase("ummah");
                  setIntroOpacity(f / 10);
                } else if (f < 50) {
                  setIntroPhase("ummah");
                  setIntroOpacity(1);
                } else if (f < 65) {
                  setIntroPhase("ummah");
                  setIntroOpacity(1 - (f - 50) / 15);
                } else if (f < 75) {
                  setIntroPhase("salik");
                  setIntroOpacity((f - 65) / 10);
                } else if (f < 130) {
                  setIntroPhase("salik");
                  setIntroOpacity(1);
                } else if (f < 145) {
                  setIntroPhase("salik");
                  setIntroOpacity(1 - (f - 130) / 15);
                } else {
                  setIntroPhase("done");
                  setIntroOpacity(0);
                }

                // Caption lines — frame position determines how many are visible
                if (f < 165) {
                  setCaptionLines(0);
                  setShowHadith(false);
                } else if (f < 190) {
                  setCaptionLines(1);
                  setShowHadith(true);
                  setHadithDissolving(false);
                } else if (f < 215) {
                  setCaptionLines(2);
                  setShowHadith(true);
                  setHadithDissolving(false);
                } else {
                  setCaptionLines(3);
                  setShowHadith(true);
                  setHadithDissolving(false);
                }
              }

              const progress = frameIdx / TOTAL_FRAMES;
              onProgressChange?.(progress);

              if (reverse) {
                frameIdx--;
              } else {
                frameIdx++;
              }
            }
            requestAnimationFrame(playNext);
          };
          requestAnimationFrame(playNext);
        });
      },
      [drawFrameAtIndex, updateCurrentFrame, onProgressChange, stopIdleLoop, showHadith]
    );

    // Play multiple sections back-to-back
    const playSections = useCallback(
      async (startIdx: number, endIdx: number) => {
        for (let i = startIdx; i <= endIdx; i++) {
          await playSection(i);
        }
      },
      [playSection]
    );

    // Handle scroll/wheel/touch to trigger next or previous clip
    useEffect(() => {
      if (!isInitialLoadComplete) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (isPlayingRef.current || isFlashingRef.current || scrollCooldownRef.current) return;
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

        if (delta > 10) {
          const nextSection = currentSectionRef.current + 1;
          if (nextSection < SECTIONS.length) {
            scrollCooldownRef.current = true;
            playSection(nextSection);
            setTimeout(() => { scrollCooldownRef.current = false; }, 300);
          }
        } else if (delta < -10) {
          const prevSection = currentSectionRef.current - 1;
          if (prevSection >= 0) {
            scrollCooldownRef.current = true;
            playSection(prevSection, true);
            setTimeout(() => { scrollCooldownRef.current = false; }, 300);
          }
        }
      };

      // Touch support for mobile
      let touchStartX = 0;
      let touchStartY = 0;

      const handleTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (isPlayingRef.current || isFlashingRef.current || scrollCooldownRef.current) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;

        if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
          if (diffY > 0) {
            const nextSection = currentSectionRef.current + 1;
            if (nextSection < SECTIONS.length) {
              scrollCooldownRef.current = true;
              playSection(nextSection);
              setTimeout(() => { scrollCooldownRef.current = false; }, 300);
            }
          } else {
            const prevSection = currentSectionRef.current - 1;
            if (prevSection >= 0) {
              scrollCooldownRef.current = true;
              playSection(prevSection, true);
              setTimeout(() => { scrollCooldownRef.current = false; }, 300);
            }
          }
        }
      };

      // Arrow key support
      const handleKeydown = (e: KeyboardEvent) => {
        if (isPlayingRef.current || isFlashingRef.current) return;

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          const nextSection = currentSectionRef.current + 1;
          if (nextSection < SECTIONS.length) playSection(nextSection);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          const prevSection = currentSectionRef.current - 1;
          if (prevSection >= 0) playSection(prevSection, true);
        }
      };

      // Lock page scroll
      document.body.style.overflow = "hidden";

      window.addEventListener("wheel", handleWheel, { passive: false });
      window.addEventListener("touchstart", handleTouchStart, { passive: true });
      window.addEventListener("touchend", handleTouchEnd, { passive: true });
      window.addEventListener("keydown", handleKeydown);

      return () => {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("keydown", handleKeydown);
        document.body.style.overflow = "";
      };
    }, [isInitialLoadComplete, playSection]);

    // Auto-play first section on load
    useEffect(() => {
      if (isInitialLoadComplete) {
        drawFrameAtIndex(0);
        setTimeout(() => {
          playSection(0);
        }, 500);
      }
    }, [isInitialLoadComplete, drawFrameAtIndex, playSection]);

    // Flash sequence (kept for API compatibility)
    useImperativeHandle(ref, () => ({
      playFlashSequence: () =>
        new Promise<void>((resolve) => {
          stopIdleLoop();
          isFlashingRef.current = true;

          const hasFlashFrames = flashFrames.current.some((f) => f !== null);

          if (!hasFlashFrames) {
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
            }
            resolve();
            return;
          }

          let frame = 0;
          const FPS_INTERVAL = 1000 / 24;
          let lastTime = performance.now();

          const playNext = (now: number) => {
            if (frame >= FLASH_FRAME_COUNT) {
              resolve();
              return;
            }

            const elapsed = now - lastTime;
            if (elapsed >= FPS_INTERVAL) {
              lastTime = now - (elapsed % FPS_INTERVAL);
              const img = flashFrames.current[frame];
              if (img) {
                drawFrame(img);
              }
              frame++;
            }
            requestAnimationFrame(playNext);
          };
          requestAnimationFrame(playNext);
        }),
    }));

    if (!isInitialLoadComplete) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <img
              src="/salik-foundation-logo.png"
              alt="Salik Foundation"
              className="mx-auto mb-6 h-12 opacity-60"
            />
            <div className="mb-4 text-sm tracking-[0.2em] uppercase text-white/50">
              Loading experience...
            </div>
            <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[#4AB3E2] transition-all duration-300"
                style={{ width: `${Math.round((frames.current.filter(Boolean).length / 30) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0">
        <canvas
          ref={(el) => {
            (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
            if (el) resizeCanvas();
          }}
          className="fixed left-0 top-0 w-screen h-screen"
          style={{ zIndex: 2 }}
        />

        {/* Cinematic intro overlays */}
        {introPhase !== "none" && introPhase !== "done" && (
          <div
            className="fixed inset-0 flex items-start justify-center pointer-events-none"
            style={{ zIndex: 8, opacity: introOpacity, paddingTop: "8vh" }}
          >
            {introPhase === "ummah" && (
              <div className="flex flex-col items-center gap-4">
                <p
                  className="text-base md:text-lg tracking-[0.4em] uppercase"
                  style={{
                    color: "#ffffff",
                    fontFamily: "'Montserrat', 'Arial', sans-serif",
                    fontWeight: 300,
                    textShadow: "0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)",
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

            {introPhase === "salik" && (
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
        )}

        {/* Caption lines — fade in one at a time over shrine footage */}
        {showHadith && (
          <div
            className={`fixed inset-0 flex items-center justify-center pointer-events-none ${hadithDissolving ? "caption-dissolve" : ""}`}
            style={{ zIndex: 9 }}
          >
            <div className="text-center px-8 max-w-4xl flex flex-col items-center gap-4">
              <p
                className="text-xl md:text-3xl lg:text-4xl"
                style={{
                  color: "#F0D878",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  textShadow: "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                  opacity: captionLines >= 1 ? 1 : 0,
                  transform: captionLines >= 1 ? "translateY(0)" : "translateY(15px)",
                  transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
                }}
              >
                No law. No scripture. No compass.
              </p>
              <p
                className="text-xl md:text-3xl lg:text-4xl"
                style={{
                  color: "#F0D878",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  textShadow: "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                  opacity: captionLines >= 2 ? 1 : 0,
                  transform: captionLines >= 2 ? "translateY(0)" : "translateY(15px)",
                  transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
                }}
              >
                For over five hundred years,
              </p>
              <p
                className="text-xl md:text-3xl lg:text-4xl"
                style={{
                  color: "#F0D878",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  textShadow: "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                  opacity: captionLines >= 3 ? 1 : 0,
                  transform: captionLines >= 3 ? "translateY(0)" : "translateY(15px)",
                  transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
                }}
              >
                Arabia lived in total darkness.
              </p>
            </div>
          </div>
        )}

        {/* Cutscene scroll prompt */}
        <div
          className="fixed bottom-12 left-0 right-0 flex justify-center pointer-events-none"
          style={{
            zIndex: 10,
            opacity: showScrollHint ? 1 : 0,
            transition: "opacity 1.5s ease",
          }}
        >
          <div
            className="flex flex-col items-center select-none"
            style={{ animation: "cutsceneFloat 3s ease-in-out infinite" }}
          >
            {/* Horizontal lines flanking the text — HUD element */}
            <div className="flex items-center gap-5 mb-4">
              <div style={{
                width: "120px", height: "2px",
                background: "linear-gradient(to right, transparent, #E8D080)",
                boxShadow: "0 0 12px rgba(232,208,128,0.6)",
                animation: "lineGlow 2.5s ease-in-out infinite",
              }} />
              <span
                className="text-3xl md:text-4xl tracking-[0.5em] uppercase"
                style={{
                  color: "#F0D878",
                  fontFamily: "'Montserrat', 'Arial', sans-serif",
                  fontWeight: 700,
                  textShadow: "0 0 25px rgba(240,216,120,0.9), 0 0 50px rgba(240,216,120,0.5), 0 0 80px rgba(200,168,78,0.3), 0 2px 6px rgba(0,0,0,0.9)",
                  animation: "textGlow 2.5s ease-in-out infinite",
                }}
              >
                Scroll
              </span>
              <div style={{
                width: "120px", height: "2px",
                background: "linear-gradient(to left, transparent, #E8D080)",
                boxShadow: "0 0 12px rgba(232,208,128,0.6)",
                animation: "lineGlow 2.5s ease-in-out infinite",
              }} />
            </div>

            {/* Animated chevron cascade */}
            <div className="flex flex-col items-center" style={{ gap: "3px" }}>
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none"
                style={{ animation: "chevronCascade 1.8s ease-in-out infinite", filter: "drop-shadow(0 0 12px rgba(240,216,120,0.8))" }}>
                <path d="M6 4L20 16L34 4" stroke="#F0D878" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none"
                style={{ animation: "chevronCascade 1.8s ease-in-out 0.2s infinite", filter: "drop-shadow(0 0 12px rgba(240,216,120,0.6))" }}>
                <path d="M6 4L20 16L34 4" stroke="#F0D878" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none"
                style={{ animation: "chevronCascade 1.8s ease-in-out 0.4s infinite", filter: "drop-shadow(0 0 12px rgba(240,216,120,0.4))" }}>
                <path d="M6 4L20 16L34 4" stroke="#F0D878" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes cutsceneFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          @keyframes chevronCascade {
            0% { opacity: 0.1; transform: translateY(-4px); }
            40% { opacity: 1; transform: translateY(0); }
            70% { opacity: 0.5; transform: translateY(4px); }
            100% { opacity: 0.1; transform: translateY(6px); }
          }
          @keyframes textGlow {
            0%, 100% { opacity: 0.85; }
            50% { opacity: 1; }
          }
          @keyframes lineGlow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes captionDissolveOut {
            0% {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0px);
            }
            100% {
              opacity: 0;
              transform: translateY(-30px);
              filter: blur(4px);
            }
          }
          .caption-dissolve p:nth-child(1) {
            animation: captionDissolveOut 1.2s ease-in forwards;
          }
          .caption-dissolve p:nth-child(2) {
            animation: captionDissolveOut 1.2s ease-in 0.15s forwards;
          }
          .caption-dissolve p:nth-child(3) {
            animation: captionDissolveOut 1.2s ease-in 0.3s forwards;
          }
        `}</style>
      </div>
    );
  }
);

export default ScrollCanvas;
