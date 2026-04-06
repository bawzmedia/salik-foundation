import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from "react";
import { useFrameLoader } from "@/hooks/useFrameLoader";
import { TOTAL_FRAMES, INITIAL_BATCH_SIZE, FLASH_FRAME_COUNT, SECTIONS, TARGET_FPS, getFocalPointForFrame, DEFAULT_FOCAL_POINT } from "@/lib/frames";
import type { FocalPoint } from "@/lib/frames";
import IntroOverlay from "./overlays/IntroOverlay";
import Section0Caption from "./overlays/Section0Caption";
import SectionQuotes from "./overlays/SectionQuotes";
import ScrollHint from "./overlays/ScrollHint";

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
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const currentFrameRef = useRef(0);
    const isFlashingRef = useRef(false);
    const isPlayingRef = useRef(false);
    const currentSectionRef = useRef(0);
    const [currentSection, setCurrentSection] = useState(0);
    const atSectionStartRef = useRef(true); // true = at start of section, false = at end
    const [showScrollHint, setShowScrollHint] = useState(false);
    const [introPhase, setIntroPhase] = useState<"none" | "ummah" | "salik" | "done">("none");
    const introOpacityRef = useRef(0);
    const introOverlayElRef = useRef<HTMLDivElement>(null);
    const [showHadith, setShowHadith] = useState(false);
    const [hadithDissolving, setHadithDissolving] = useState(false);
    const [captionLines, setCaptionLines] = useState<number>(0); // 0-3 lines visible
    const showHadithRef = useRef(false);
    const [sectionQuote, setSectionQuote] = useState<number | null>(null);
    const [quoteDissolving, setQuoteDissolving] = useState(false);
    const sectionQuoteRef = useRef<number | null>(null);
    const baalFadeRef = useRef(0);
    const quoteInnerElRef = useRef<HTMLDivElement>(null);
    const quoteDisolvingRef = useRef(false);
    const scrollCooldownRef = useRef(false);
    const idleLoopRef = useRef<number | null>(null);

    const { frames, flashFrames, isInitialLoadComplete, isFallback, updateCurrentFrame } =
      useFrameLoader();

    useEffect(() => {
      if (isFallback && onFallback) onFallback();
    }, [isFallback, onFallback]);

    // Draw a frame to the canvas with cover crop behavior (Retina-aware)
    // Focal point shifts the crop origin so the subject stays visible on mobile
    const drawFrame = useCallback((img: HTMLImageElement, focal: FocalPoint = DEFAULT_FOCAL_POINT) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!ctxRef.current) ctxRef.current = canvas.getContext("2d");
      const ctx = ctxRef.current;
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displayW = canvas.width / dpr;
      const displayH = canvas.height / dpr;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      const scale = Math.max(displayW / imgW, displayH / imgH);
      const sw = displayW / scale;
      const sh = displayH / scale;
      // Anchor crop to focal point, clamped so we never read outside the image
      const sx = Math.max(0, Math.min(imgW - sw, focal.x * imgW - sw / 2));
      const sy = Math.max(0, Math.min(imgH - sh, focal.y * imgH - sh / 2));

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
        if (frameImg) drawFrame(frameImg, getFocalPointForFrame(index));
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
      if (frameImg) drawFrame(frameImg, getFocalPointForFrame(idx));
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
            quoteDisolvingRef.current = true;
            setQuoteDissolving(true);
            // Clear inline styles so CSS animation takes over
            if (quoteInnerElRef.current) {
              quoteInnerElRef.current.style.opacity = '';
              quoteInnerElRef.current.style.transform = '';
            }
            setTimeout(() => {
              setSectionQuote(null);
              sectionQuoteRef.current = null;
              quoteDisolvingRef.current = false;
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
                  introOpacityRef.current = 0;
                  if (introOverlayElRef.current) introOverlayElRef.current.style.opacity = '0';
                  setShowHadith(false); showHadithRef.current = false;
                  setCaptionLines(0);
                } else {
                  // Played forward to end — captions fully visible
                  setIntroPhase("done");
                  introOpacityRef.current = 0;
                  if (introOverlayElRef.current) introOverlayElRef.current.style.opacity = '0';
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
              // Gate: skip advance if target frame isn't decoded yet
              if (!frames.current[frameIdx]) {
                requestAnimationFrame(playNext);
                return;
              }
              lastTime = now - (elapsed % FPS_INTERVAL);
              currentFrameRef.current = frameIdx;
              drawFrameAtIndex(frameIdx);

              // Drive intro overlays during section 0 (clip 1+2)
              // Works identically forward and reverse — frame position determines state
              if (sectionIndex === 0) {
                const f = frameIdx; // 0-indexed frame

                // Logos
                // Compute intro opacity and phase — update ref + DOM directly
                let nextOpacity = 0;
                let nextPhase: "ummah" | "salik" | "done" = "done";
                if (f < 10) {
                  nextPhase = "ummah"; nextOpacity = f / 10;
                } else if (f < 50) {
                  nextPhase = "ummah"; nextOpacity = 1;
                } else if (f < 65) {
                  nextPhase = "ummah"; nextOpacity = 1 - (f - 50) / 15;
                } else if (f < 75) {
                  nextPhase = "salik"; nextOpacity = (f - 65) / 10;
                } else if (f < 130) {
                  nextPhase = "salik"; nextOpacity = 1;
                } else if (f < 145) {
                  nextPhase = "salik"; nextOpacity = 1 - (f - 130) / 15;
                }
                setIntroPhase(nextPhase);
                introOpacityRef.current = nextOpacity;
                if (introOverlayElRef.current) introOverlayElRef.current.style.opacity = String(nextOpacity);

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

              // Drive section quote fade via ref + direct DOM (no React re-render per frame)
              // Each section: compute fade progress, update ref, update DOM element
              const updateQuoteFade = (val: number, translateDist: number) => {
                baalFadeRef.current = val;
                if (quoteInnerElRef.current && !quoteDisolvingRef.current) {
                  quoteInnerElRef.current.style.opacity = String(val);
                  quoteInnerElRef.current.style.transform = `translateY(${(1 - val) * translateDist}px)`;
                }
              };

              if (sectionIndex === 1) {
                const rel = frameIdx - 241;
                if (rel < 136) {
                  baalFadeRef.current = 0;
                  if (sectionQuoteRef.current !== null) {
                    setSectionQuote(null); sectionQuoteRef.current = null;
                  }
                } else {
                  if (sectionQuoteRef.current !== 1) {
                    setSectionQuote(1); sectionQuoteRef.current = 1; setQuoteDissolving(false);
                  }
                  updateQuoteFade(Math.min(1, (rel - 136) / 15), 15);
                }
              } else if (sectionIndex === 2) {
                const rel = frameIdx - 392;
                if (rel < 136) {
                  if (sectionQuoteRef.current !== null) {
                    setSectionQuote(null); sectionQuoteRef.current = null;
                  }
                } else {
                  if (sectionQuoteRef.current !== 2) {
                    setSectionQuote(2); sectionQuoteRef.current = 2; setQuoteDissolving(false);
                  }
                  updateQuoteFade(Math.min(1, (rel - 136) / 15), 20);
                }
              } else if (sectionIndex === 3) {
                const rel = frameIdx - 543;
                if (rel < 101) {
                  if (sectionQuoteRef.current !== null) {
                    setSectionQuote(null); sectionQuoteRef.current = null;
                  }
                } else {
                  if (sectionQuoteRef.current !== 3) {
                    setSectionQuote(3); sectionQuoteRef.current = 3; setQuoteDissolving(false);
                  }
                  updateQuoteFade(Math.min(1, (rel - 101) / 15), 20);
                }
              } else if (sectionIndex === 4) {
                const rel = frameIdx - 664;
                if (rel < 101) {
                  if (sectionQuoteRef.current !== null) {
                    setSectionQuote(null); sectionQuoteRef.current = null;
                  }
                } else {
                  if (sectionQuoteRef.current !== 4) {
                    setSectionQuote(4); sectionQuoteRef.current = 4; setQuoteDissolving(false);
                  }
                  updateQuoteFade(Math.min(1, (rel - 101) / 15), 20);
                }
              } else if (sectionQuoteRef.current !== null) {
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
              if (!ctxRef.current) ctxRef.current = canvas.getContext("2d");
              const ctx = ctxRef.current;
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
                style={{ width: `${Math.round((frames.current.filter(Boolean).length / INITIAL_BATCH_SIZE) * 100)}%` }}
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
            ctxRef.current = null; // reset cached context when canvas element changes
            if (el) resizeCanvas();
          }}
          className="fixed left-0 top-0 w-screen h-screen"
          style={{ zIndex: 2 }}
        />

        {/* Cinematic intro overlays */}
        {introPhase !== "none" && introPhase !== "done" && (
          <IntroOverlay
            ref={introOverlayElRef}
            phase={introPhase}
            initialOpacity={introOpacityRef.current}
          />
        )}

        {/* Section 0 — "500 YEARS OF DARKNESS" headline + subtitle */}
        {showHadith && (
          <Section0Caption dissolving={hadithDissolving} captionLines={captionLines} />
        )}

        {/* Section quotes — positioned per scene */}
        {sectionQuote !== null && (
          <SectionQuotes
            ref={quoteInnerElRef}
            sectionIndex={sectionQuote}
            dissolving={quoteDissolving}
            initialFade={baalFadeRef.current}
          />
        )}

        {/* Cutscene scroll prompt */}
        <ScrollHint visible={showScrollHint} />

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
