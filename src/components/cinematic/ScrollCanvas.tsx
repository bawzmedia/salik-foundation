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

        {/* Scroll hint */}
        <div
          className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none"
          style={{
            zIndex: 10,
            opacity: showScrollHint ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          <span
            className="text-sm tracking-[0.25em] uppercase select-none"
            style={{
              color: "#C8A84E",
              fontFamily: "Georgia, serif",
              textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
              animation: "scrollBounce 2s ease-in-out infinite",
            }}
          >
            Scroll
          </span>
        </div>

        <style>{`
          @keyframes scrollBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}</style>
      </div>
    );
  }
);

export default ScrollCanvas;
