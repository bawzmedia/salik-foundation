import { useRef, useEffect, useCallback, useState } from "react";
import { useFrameLoader } from "@/hooks/useFrameLoader";
import { TOTAL_FRAMES, SECTIONS } from "@/lib/frames";

interface ScrollCanvasProps {
  onProgressChange?: (progress: number) => void;
  onSectionChange?: (sectionIndex: number) => void;
  onFallback?: () => void;
}

export default function ScrollCanvas({ onProgressChange, onSectionChange, onFallback }: ScrollCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentFrameRef = useRef(0);
  const isPlayingRef = useRef(false);
  const currentSectionRef = useRef(0);
  const scrollCooldownRef = useRef(false);
  const idleLoopRef = useRef<number | null>(null);
  const IDLE_LOOP_FRAMES = 15;

  const { frames, isInitialLoadComplete, isFallback, updateCurrentFrame } = useFrameLoader();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isInitialLoadComplete) setLoading(false);
  }, [isInitialLoadComplete]);

  useEffect(() => {
    if (isFallback && onFallback) onFallback();
  }, [isFallback, onFallback]);

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
    drawFrameAtIndex(currentFrameRef.current);
  }, [drawFrameAtIndex]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const stopIdleLoop = useCallback(() => {
    if (idleLoopRef.current !== null) {
      cancelAnimationFrame(idleLoopRef.current);
      idleLoopRef.current = null;
    }
  }, []);

  const startIdleLoop = useCallback((sectionIndex: number) => {
    stopIdleLoop();
    const section = SECTIONS[sectionIndex];
    if (!section) return;

    const loopEnd = section.endFrame - 1;
    const loopStart = Math.max(section.startFrame - 1, loopEnd - IDLE_LOOP_FRAMES + 1);
    let frameIdx = loopEnd;
    let direction = -1;
    const FPS_INTERVAL = 1000 / 12;
    let lastTime = performance.now();

    const animate = (now: number) => {
      if (isPlayingRef.current) {
        idleLoopRef.current = null;
        return;
      }

      const elapsed = now - lastTime;
      if (elapsed >= FPS_INTERVAL) {
        lastTime = now - (elapsed % FPS_INTERVAL);
        drawFrameAtIndex(frameIdx);

        frameIdx += direction;
        if (frameIdx <= loopStart) {
          direction = 1;
          frameIdx = loopStart;
        } else if (frameIdx >= loopEnd) {
          direction = -1;
          frameIdx = loopEnd;
        }
      }
      idleLoopRef.current = requestAnimationFrame(animate);
    };

    idleLoopRef.current = requestAnimationFrame(animate);
  }, [drawFrameAtIndex, stopIdleLoop]);

  const playSection = useCallback(
    (sectionIndex: number, reverse: boolean = false): Promise<void> => {
      return new Promise((resolve) => {
        if (sectionIndex < 0 || sectionIndex >= SECTIONS.length) { resolve(); return; }
        if (isPlayingRef.current) { resolve(); return; }

        stopIdleLoop();
        isPlayingRef.current = true;
        const section = SECTIONS[sectionIndex];
        const startFrame = section.startFrame - 1;
        const endFrame = section.endFrame - 1;

        let frameIdx = reverse ? endFrame : startFrame;
        const FPS_INTERVAL = 1000 / 24;
        let lastTime = performance.now();

        for (let i = startFrame; i <= endFrame; i++) {
          updateCurrentFrame(i);
        }

        const playNext = (now: number) => {
          const done = reverse ? frameIdx < startFrame : frameIdx > endFrame;
          if (done) {
            isPlayingRef.current = false;
            currentSectionRef.current = sectionIndex;
            onSectionChange?.(sectionIndex);

            const progress = reverse
              ? (section.startFrame - 1) / TOTAL_FRAMES
              : section.endFrame / TOTAL_FRAMES;
            onProgressChange?.(progress);

            startIdleLoop(sectionIndex);
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

            if (reverse) frameIdx--;
            else frameIdx++;
          }
          requestAnimationFrame(playNext);
        };
        requestAnimationFrame(playNext);
      });
    },
    [drawFrameAtIndex, updateCurrentFrame, onProgressChange, onSectionChange, stopIdleLoop, startIdleLoop]
  );

  // Scroll/wheel/touch/keyboard navigation
  useEffect(() => {
    if (!isInitialLoadComplete) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isPlayingRef.current || scrollCooldownRef.current) return;

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

    let touchStartY = 0;
    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPlayingRef.current || scrollCooldownRef.current) return;

      const diffX = touchStartX - e.changedTouches[0].clientX;
      const diffY = touchStartY - e.changedTouches[0].clientY;

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

    const handleKeydown = (e: KeyboardEvent) => {
      if (isPlayingRef.current) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        const nextSection = currentSectionRef.current + 1;
        if (nextSection < SECTIONS.length) playSection(nextSection);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        const prevSection = currentSectionRef.current - 1;
        if (prevSection >= 0) playSection(prevSection, true);
      }
    };

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

  if (loading) {
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
        className="fixed left-0 top-0 h-screen w-screen"
        style={{ zIndex: 2 }}
      />
    </div>
  );
}
