// Canvas engine — Svelte action pattern
// All imperative canvas logic lives here, outside Svelte's compiler scope
import { TOTAL_FRAMES, SECTIONS } from "./frames";
import { frames, updateCurrentFrame, initFrameLoader, isInitialLoadComplete } from "../stores/frameLoader";

export interface EngineCallbacks {
  onShowScrollHint: (show: boolean) => void;
  onIntroPhase: (phase: string, opacity: number) => void;
  onCaptionLines: (lines: number, show: boolean, dissolving: boolean) => void;
  onSectionQuote: (quote: number | null, dissolving: boolean, fadeProgress: number) => void;
  onProgress: (progress: number) => void;
}

export function createCanvasEngine(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
  let ctx: CanvasRenderingContext2D | null = canvas.getContext("2d", { alpha: false });
  let dpr = window.devicePixelRatio || 1;
  let currentFrame = 0;
  let isPlaying = false;
  let currentSectionIdx = 0;
  let atSectionStart = true;
  let scrollCooldown = false;
  let destroyed = false;

  // ── Drawing ──

  function drawFrame(img: HTMLImageElement): void {
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const displayW = cw / dpr;
    const displayH = ch / dpr;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const scale = Math.max(displayW / imgW, displayH / imgH);
    const sw = displayW / scale;
    const sh = displayH / scale;
    ctx.drawImage(img, (imgW - sw) * 0.5, (imgH - sh) * 0.5, sw, sh, 0, 0, cw, ch);
  }

  function drawFrameAtIndex(index: number): void {
    let frameImg: HTMLImageElement | null = frames[index];
    if (!frameImg) {
      for (let i = index - 1; i >= 0; i--) {
        if (frames[i]) { frameImg = frames[i]; break; }
      }
    }
    if (frameImg) drawFrame(frameImg);
  }

  function resizeCanvas(): void {
    dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      ctx = canvas.getContext("2d", { alpha: false });
    }
    drawFrameAtIndex(currentFrame);
  }

  // ── Overlay state driven by frame position ──

  function updateOverlayState(sectionIndex: number, frameIdx: number): void {
    if (sectionIndex === 0) {
      const f = frameIdx;
      if (f < 10) callbacks.onIntroPhase("ummah", f / 10);
      else if (f < 50) callbacks.onIntroPhase("ummah", 1);
      else if (f < 65) callbacks.onIntroPhase("ummah", 1 - (f - 50) / 15);
      else if (f < 75) callbacks.onIntroPhase("salik", (f - 65) / 10);
      else if (f < 130) callbacks.onIntroPhase("salik", 1);
      else if (f < 145) callbacks.onIntroPhase("salik", 1 - (f - 130) / 15);
      else callbacks.onIntroPhase("done", 0);

      if (f < 165) callbacks.onCaptionLines(0, false, false);
      else if (f < 190) callbacks.onCaptionLines(1, true, false);
      else if (f < 215) callbacks.onCaptionLines(2, true, false);
      else callbacks.onCaptionLines(3, true, false);
    }

    const quoteConfig: Record<number, { base: number; threshold: number }> = {
      1: { base: 241, threshold: 136 },
      2: { base: 392, threshold: 136 },
      3: { base: 543, threshold: 101 },
      4: { base: 664, threshold: 101 },
    };

    const cfg = quoteConfig[sectionIndex];
    if (cfg) {
      const rel = frameIdx - cfg.base;
      if (rel < cfg.threshold) {
        callbacks.onSectionQuote(null, false, 0);
      } else {
        callbacks.onSectionQuote(sectionIndex, false, Math.min(1, (rel - cfg.threshold) / 15));
      }
    } else if (sectionIndex !== 0) {
      callbacks.onSectionQuote(null, false, 0);
    }
  }

  // ── Playback ──

  function playSection(sectionIndex: number, reverse = false): Promise<void> {
    return new Promise((resolve) => {
      if (sectionIndex < 0 || sectionIndex >= SECTIONS.length || isPlaying || destroyed) {
        resolve(); return;
      }

      isPlaying = true;
      callbacks.onShowScrollHint(false);

      // Dissolve quotes when scrolling forward
      if (!reverse) {
        callbacks.onSectionQuote(null, true, 0);
        setTimeout(() => callbacks.onSectionQuote(null, false, 0), 1500);
      }
      // Dissolve captions when leaving section 0 forward
      if (sectionIndex > 0 && !reverse) {
        callbacks.onCaptionLines(0, true, true);
        setTimeout(() => callbacks.onCaptionLines(0, false, false), 1500);
      }
      // Reversing into section 0
      if (sectionIndex === 0 && reverse) {
        callbacks.onCaptionLines(3, true, false);
      }

      const section = SECTIONS[sectionIndex];
      const startFrame = section.startFrame - 1;
      const endFrame = section.endFrame - 1;
      let frameIdx = reverse ? endFrame : startFrame;
      const FPS_INTERVAL = 1000 / 48;
      let lastTime = performance.now();

      // Preload
      for (let i = startFrame; i <= endFrame; i++) updateCurrentFrame(i);

      const playNext = (now: number) => {
        if (destroyed) { resolve(); return; }
        const done = reverse ? frameIdx < startFrame : frameIdx > endFrame;
        if (done) {
          isPlaying = false;

          if (reverse && sectionIndex > 0) {
            const prevSection = sectionIndex - 1;
            const prevEndFrame = SECTIONS[prevSection].endFrame - 1;
            currentFrame = prevEndFrame;
            drawFrameAtIndex(prevEndFrame);
            currentSectionIdx = prevSection;
            atSectionStart = false;
            if (prevSection > 0) {
              callbacks.onSectionQuote(prevSection, false, 1);
            } else if (prevSection === 0) {
              callbacks.onCaptionLines(3, true, false);
            }
          } else {
            currentSectionIdx = sectionIndex;
            atSectionStart = reverse;
          }

          const prog = reverse
            ? (sectionIndex > 0 ? SECTIONS[sectionIndex - 1].endFrame / TOTAL_FRAMES : (section.startFrame - 1) / TOTAL_FRAMES)
            : section.endFrame / TOTAL_FRAMES;
          callbacks.onProgress(prog);

          if (sectionIndex === 0) {
            if (reverse) {
              callbacks.onIntroPhase("ummah", 0);
              callbacks.onCaptionLines(0, false, false);
            } else {
              callbacks.onIntroPhase("done", 0);
              callbacks.onCaptionLines(3, true, false);
            }
          }

          if (!(sectionIndex === 0 && reverse)) {
            callbacks.onShowScrollHint(true);
            if (!reverse && sectionIndex > 0) {
              callbacks.onSectionQuote(sectionIndex, false, 1);
            }
          }

          resolve();
          return;
        }

        const elapsed = now - lastTime;
        if (elapsed >= FPS_INTERVAL) {
          lastTime = now - (elapsed % FPS_INTERVAL);
          currentFrame = frameIdx;
          drawFrameAtIndex(frameIdx);
          updateOverlayState(sectionIndex, frameIdx);
          callbacks.onProgress(frameIdx / TOTAL_FRAMES);
          if (reverse) frameIdx--; else frameIdx++;
        }
        requestAnimationFrame(playNext);
      };
      requestAnimationFrame(playNext);
    });
  }

  // ── Scroll handling ──

  function handleScroll(forward: boolean): void {
    if (isPlaying || scrollCooldown || destroyed) return;
    if (forward) {
      const target = atSectionStart ? currentSectionIdx : currentSectionIdx + 1;
      if (target < SECTIONS.length) {
        scrollCooldown = true;
        playSection(target);
        setTimeout(() => { scrollCooldown = false; }, 150);
      }
    } else {
      const target = atSectionStart ? currentSectionIdx - 1 : currentSectionIdx;
      if (target >= 0) {
        scrollCooldown = true;
        playSection(target, true);
        setTimeout(() => { scrollCooldown = false; }, 150);
      }
    }
  }

  // ── Event handlers ──

  let touchStartY = 0;

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta > 10) handleScroll(true);
    else if (delta < -10) handleScroll(false);
  }

  function onTouchStart(e: TouchEvent): void {
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent): void {
    const diffY = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diffY) > 50) handleScroll(diffY > 0);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (isPlaying) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") handleScroll(true);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") handleScroll(false);
  }

  // ── Init ──

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";

  // Start loading and auto-play
  initFrameLoader();
  const unsub = isInitialLoadComplete.subscribe((loaded) => {
    if (loaded) {
      resizeCanvas();
      drawFrameAtIndex(0);
      setTimeout(() => playSection(0), 500);
      unsub();
    }
  });

  // Return destroy function
  return {
    destroy() {
      destroyed = true;
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeydown);
      document.body.style.overflow = "";
    }
  };
}
