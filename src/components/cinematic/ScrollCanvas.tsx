import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from "react";
import { useFrameLoader } from "@/hooks/useFrameLoader";
import { TOTAL_FRAMES, FLASH_FRAME_COUNT, SECTIONS, TARGET_FPS } from "@/lib/frames";

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
    const atSectionStartRef = useRef(true); // true = at start of section, false = at end
    const [showScrollHint, setShowScrollHint] = useState(false);
    const [introPhase, setIntroPhase] = useState<"none" | "ummah" | "salik" | "done">("none");
    const [introOpacity, setIntroOpacity] = useState(0);
    const [showHadith, setShowHadith] = useState(false);
    const [hadithDissolving, setHadithDissolving] = useState(false);
    const [captionLines, setCaptionLines] = useState<number>(0); // 0-3 lines visible
    const showHadithRef = useRef(false);
    const [sectionQuote, setSectionQuote] = useState<number | null>(null);
    const [quoteDissolving, setQuoteDissolving] = useState(false);
    const sectionQuoteRef = useRef<number | null>(null);
    const [baalFadeProgress, setBaalFadeProgress] = useState(0);
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
          // Dissolve any section quote when scrolling away
          if (sectionQuoteRef.current !== null && !reverse) {
            setQuoteDissolving(true);
            setTimeout(() => {
              setSectionQuote(null);
              sectionQuoteRef.current = null;
              setQuoteDissolving(false);
            }, 1500);
          }
          // Dissolve captions when scrolling forward away from section 0
          if (showHadithRef.current && sectionIndex > 0 && !reverse) {
            setHadithDissolving(true);
            setTimeout(() => {
              setShowHadith(false);
              showHadithRef.current = false;
              setHadithDissolving(false);
              setCaptionLines(0);
            }, 1500);
          }
          // When reversing section 0, ensure captions are visible and not dissolving
          // The frame-driven logic will handle showing/hiding them at the right frames
          if (sectionIndex === 0 && reverse) {
            setHadithDissolving(false);
            setShowHadith(true);
            showHadithRef.current = true;
            setCaptionLines(3); // Start fully visible, frame logic will reduce as we reverse
          }
          const section = SECTIONS[sectionIndex];
          const startFrame = section.startFrame - 1; // 0-indexed
          const endFrame = section.endFrame - 1; // 0-indexed

          let frameIdx = reverse ? endFrame : startFrame;
          const FPS_INTERVAL = 1000 / TARGET_FPS;
          let lastTime = performance.now();

          // Preload frames for this section
          for (let i = startFrame; i <= endFrame; i++) {
            updateCurrentFrame(i);
          }

          const playNext = (now: number) => {
            const done = reverse ? frameIdx < startFrame : frameIdx > endFrame;
            if (done) {
              isPlayingRef.current = false;

              if (reverse && sectionIndex > 0) {
                // Land on the previous section's last frame (HD still)
                const prevSection = sectionIndex - 1;
                const prevEndFrame = SECTIONS[prevSection].endFrame - 1; // 0-indexed
                currentFrameRef.current = prevEndFrame;
                drawFrameAtIndex(prevEndFrame);
                currentSectionRef.current = prevSection;
                setCurrentSection(prevSection);
                atSectionStartRef.current = false; // at END of previous section
                // Restore that section's quote
                if (prevSection > 0) {
                  setSectionQuote(prevSection);
                  sectionQuoteRef.current = prevSection;
                  setQuoteDissolving(false);
                } else if (prevSection === 0) {
                  // Section 0 uses the caption system
                  setShowHadith(true); showHadithRef.current = true;
                  setCaptionLines(3);
                  setHadithDissolving(false);
                }
              } else {
                currentSectionRef.current = sectionIndex;
                setCurrentSection(sectionIndex);
                atSectionStartRef.current = reverse; // reverse section 0 = at start
              }

              const progress = reverse
                ? (reverse && sectionIndex > 0
                    ? SECTIONS[sectionIndex - 1].endFrame / TOTAL_FRAMES
                    : (section.startFrame - 1) / TOTAL_FRAMES)
                : section.endFrame / TOTAL_FRAMES;
              onProgressChange?.(progress);

              // Section 0 completion — depends on direction
              if (sectionIndex === 0) {
                if (reverse) {
                  // Scrolled back to beginning — show ummah logo at frame 0
                  setIntroPhase("ummah");
                  setIntroOpacity(0);
                  setShowHadith(false); showHadithRef.current = false;
                  setCaptionLines(0);
                } else {
                  // Played forward to end — captions fully visible
                  setIntroPhase("done");
                  setIntroOpacity(0);
                  setShowHadith(true); showHadithRef.current = true;
                  setCaptionLines(3);
                }
              }

              // Show scroll hint and section quote unless at very start
              if (!(sectionIndex === 0 && reverse)) {
                setShowScrollHint(true);
                // Show quote for sections that have one (not section 0 — it uses captions)
                if (!reverse && sectionIndex > 0) {
                  setSectionQuote(sectionIndex);
                  sectionQuoteRef.current = sectionIndex;
                  setQuoteDissolving(false);
                }
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
                  setShowHadith(false); showHadithRef.current = false;
                } else if (f < 190) {
                  setCaptionLines(1);
                  setShowHadith(true); showHadithRef.current = true;
                  setHadithDissolving(false);
                } else if (f < 215) {
                  setCaptionLines(2);
                  setShowHadith(true); showHadithRef.current = true;
                  setHadithDissolving(false);
                } else {
                  setCaptionLines(3);
                  setShowHadith(true); showHadithRef.current = true;
                  setHadithDissolving(false);
                }
              }

              // Drive section 1 quote during playback (frame-driven)
              if (sectionIndex === 1) {
                const rel = frameIdx - 241; // relative to section start (0-indexed)
                // Appear ~15 frames from end (rel 136+), fade in over 15 frames
                if (rel < 136) {
                  setBaalFadeProgress(0);
                  setSectionQuote(null);
                  sectionQuoteRef.current = null;
                } else {
                  setSectionQuote(1);
                  sectionQuoteRef.current = 1;
                  setQuoteDissolving(false);
                  setBaalFadeProgress(Math.min(1, (rel - 136) / 15));
                }
              } else if (sectionIndex === 2) {
                // Section 2: clip 4 — "The Qur'an Descends" (0-indexed: 392-542)
                const rel = frameIdx - 392;
                if (rel < 136) {
                  setSectionQuote(null);
                  sectionQuoteRef.current = null;
                } else {
                  setSectionQuote(2);
                  sectionQuoteRef.current = 2;
                  setQuoteDissolving(false);
                  setBaalFadeProgress(Math.min(1, (rel - 136) / 15));
                }
              } else if (sectionIndex === 3) {
                // Section 3: clip 5 — "Transformation of Arabia" (0-indexed: 543-663)
                const rel = frameIdx - 543;
                // 121 frames total, appear ~20 frames from end
                if (rel < 101) {
                  setSectionQuote(null);
                  sectionQuoteRef.current = null;
                } else {
                  setSectionQuote(3);
                  sectionQuoteRef.current = 3;
                  setQuoteDissolving(false);
                  setBaalFadeProgress(Math.min(1, (rel - 101) / 15));
                }
              } else if (sectionIndex === 4) {
                // Section 4: clip 6 — "The Message Reaches the World" (0-indexed: 664-784)
                const rel = frameIdx - 664;
                // 121 frames total, appear ~20 frames from end
                if (rel < 101) {
                  setSectionQuote(null);
                  sectionQuoteRef.current = null;
                } else {
                  setSectionQuote(4);
                  sectionQuoteRef.current = 4;
                  setQuoteDissolving(false);
                  setBaalFadeProgress(Math.min(1, (rel - 101) / 15));
                }
              } else if (sectionQuoteRef.current !== null) {
                // Clear quotes when playing other sections
                setSectionQuote(null);
                sectionQuoteRef.current = null;
                setQuoteDissolving(false);
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
      [drawFrameAtIndex, updateCurrentFrame, onProgressChange, stopIdleLoop]
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
          // Forward: if at start of section, play it forward. If at end, play next.
          const cur = currentSectionRef.current;
          const target = atSectionStartRef.current ? cur : cur + 1;
          if (target < SECTIONS.length) {
            scrollCooldownRef.current = true;
            playSection(target);
            setTimeout(() => { scrollCooldownRef.current = false; }, 300);
          }
        } else if (delta < -10) {
          // Backward: if at end of section, reverse it. If at start, reverse previous.
          const cur = currentSectionRef.current;
          const target = atSectionStartRef.current ? cur - 1 : cur;
          if (target >= 0) {
            scrollCooldownRef.current = true;
            playSection(target, true);
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
            const cur = currentSectionRef.current;
            const target = atSectionStartRef.current ? cur : cur + 1;
            if (target < SECTIONS.length) {
              scrollCooldownRef.current = true;
              playSection(target);
              setTimeout(() => { scrollCooldownRef.current = false; }, 300);
            }
          } else {
            const cur = currentSectionRef.current;
            const target = atSectionStartRef.current ? cur - 1 : cur;
            if (target >= 0) {
              scrollCooldownRef.current = true;
              playSection(target, true);
              setTimeout(() => { scrollCooldownRef.current = false; }, 300);
            }
          }
        }
      };

      // Arrow key support
      const handleKeydown = (e: KeyboardEvent) => {
        if (isPlayingRef.current || isFlashingRef.current) return;

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          const cur = currentSectionRef.current;
          const target = atSectionStartRef.current ? cur : cur + 1;
          if (target < SECTIONS.length) playSection(target);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          const cur = currentSectionRef.current;
          const target = atSectionStartRef.current ? cur - 1 : cur;
          if (target >= 0) playSection(target, true);
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
          const FPS_INTERVAL = 1000 / TARGET_FPS;
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

        {/* Section 0 — "500 YEARS OF DARKNESS" headline + subtitle */}
        {showHadith && (
          <div
            className={`fixed inset-0 flex items-center justify-center pointer-events-none ${hadithDissolving ? "caption-dissolve" : ""}`}
            style={{ zIndex: 9 }}
          >
            <div className="text-center px-8 max-w-4xl flex flex-col items-center gap-2">
              <h2
                style={{
                  color: "#FFFFFF",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontWeight: 400,
                  fontSize: "clamp(3rem, 10vw, 8rem)",
                  lineHeight: 0.95,
                  letterSpacing: "0.04em",
                  textShadow: "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                  opacity: captionLines >= 1 ? 1 : 0,
                  transform: captionLines >= 1 ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
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
                  textShadow: "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                  opacity: captionLines >= 2 ? 1 : 0,
                  transform: captionLines >= 2 ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
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
                  textShadow: "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                  opacity: captionLines >= 3 ? 1 : 0,
                  transform: captionLines >= 3 ? "translateY(0)" : "translateY(15px)",
                  transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
                  letterSpacing: "0.15em",
                }}
              >
                No law. No scripture. No guidance.
              </p>
            </div>
          </div>
        )}

        {/* Section quotes — positioned per scene */}
        {sectionQuote !== null && (
          <div
            className={`fixed inset-0 pointer-events-none ${quoteDissolving ? "caption-dissolve" : ""}`}
            style={{ zIndex: 9 }}
          >
            {/* Section 1 — THEY BOWED TO STONE */}
            {sectionQuote === 1 && (
              <div
                className="absolute top-0"
                style={{
                  left: "25vw",
                  paddingTop: "8vh",
                  maxWidth: "650px",
                  opacity: quoteDissolving ? undefined : baalFadeProgress,
                  transform: quoteDissolving ? undefined : `translateY(${(1 - baalFadeProgress) * 15}px)`,
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
                    textShadow: "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                    margin: 0,
                  }}
                >
                  They Bowed<br />To Stone
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
                    textShadow: "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                    lineHeight: 1.5,
                  }}
                >
                  &ldquo;Do you call upon Baal and abandon the Best of Creators &mdash;<br />
                  Allah, your Lord and the Lord of your forefathers?&rdquo;
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
            {sectionQuote === 2 && (
              <div
                className="flex flex-col items-center pt-[2vh]"
                style={{
                  opacity: quoteDissolving ? undefined : baalFadeProgress,
                  transform: quoteDissolving ? undefined : `translateY(${(1 - baalFadeProgress) * 20}px)`,
                }}
              >
                <img
                  src="/quran-open.webp"
                  alt="The Holy Qur'an"
                  className="h-48 md:h-64 lg:h-80 mb-6"
                  style={{
                    filter: "drop-shadow(0 0 40px rgba(200,168,78,0.4)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))",
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
                    textShadow: "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  Allah&rsquo;s Mercy<br />Sent Light
                </h2>
                <p
                  className="mt-4"
                  style={{
                    color: "#F0D878",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: "clamp(0.9rem, 2vw, 1.3rem)",
                    textShadow: "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                    lineHeight: 1.7,
                    textAlign: "center",
                    maxWidth: "600px",
                    padding: "0 2rem",
                  }}
                >
                  &ldquo;A Book sent down to bring mankind<br />
                  out of darkness and into light.&rdquo;
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
            {sectionQuote === 3 && (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  height: "100vh",
                  opacity: quoteDissolving ? undefined : baalFadeProgress,
                  transform: quoteDissolving ? undefined : `translateY(${(1 - baalFadeProgress) * 20}px)`,
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
                    textShadow: "0 0 50px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  Everything<br />Changed
                </h2>
                <p
                  className="mt-4"
                  style={{
                    color: "#F0D878",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
                    textShadow: "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
                    textAlign: "center",
                    letterSpacing: "0.1em",
                  }}
                >
                  One revelation. One message. One God.
                </p>
              </div>
            )}

            {/* Section 4 — THE WORLD LISTENED */}
            {sectionQuote === 4 && (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  height: "100vh",
                  opacity: quoteDissolving ? undefined : baalFadeProgress,
                  transform: quoteDissolving ? undefined : `translateY(${(1 - baalFadeProgress) * 20}px)`,
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
                    textShadow: "0 0 50px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9)",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  The World<br />Listened
                </h2>
                <p
                  className="mt-4"
                  style={{
                    color: "#F0D878",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
                    textShadow: "0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)",
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
          @keyframes quoteFadeIn {
            0% { opacity: 0; transform: translateY(15px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .quote-fade-in {
            animation: quoteFadeIn 1.5s ease-out forwards;
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
