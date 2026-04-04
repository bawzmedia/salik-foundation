<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { TOTAL_FRAMES, SECTIONS } from "../../lib/frames";
  import { frames, isInitialLoadComplete, isFallback, updateCurrentFrame, initFrameLoader } from "../../stores/frameLoader";

  // Reactive state — Svelte updates only the DOM nodes that use these
  let showScrollHint = false;
  let introPhase: "none" | "ummah" | "salik" | "done" = "none";
  let introOpacity = 0;
  let showHadith = false;
  let hadithDissolving = false;
  let captionLines = 0;
  let sectionQuote: number | null = null;
  let quoteDissolving = false;
  let baalFadeProgress = 0;
  let progress = 0;

  // Non-reactive engine state
  let canvasEl: HTMLCanvasElement;
  let currentFrame = 0;
  let isPlaying = false;
  let currentSectionIdx = 0;
  let atSectionStart = true;
  let scrollCooldown = false;

  // Canvas rendering — uses module-level refs to avoid Svelte compiler dead-code elimination
  let _ctx: CanvasRenderingContext2D | null = null;
  let _dpr = 1;

  function drawFrame(img: HTMLImageElement): void {
    const c = canvasEl;
    const ct = _ctx;
    if (!c || !ct) return;
    const cw = c.width;
    const ch = c.height;
    const d = _dpr;
    const displayW = cw / d;
    const displayH = ch / d;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const scale = Math.max(displayW / imgW, displayH / imgH);
    const sw = displayW / scale;
    const sh = displayH / scale;
    ct.drawImage(img, (imgW - sw) * 0.5, (imgH - sh) * 0.5, sw, sh, 0, 0, cw, ch);
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
    const c = canvasEl;
    if (!c) return;
    _dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * _dpr);
    const h = Math.round(window.innerHeight * _dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
      _ctx = c.getContext("2d", { alpha: false });
    }
    drawFrameAtIndex(currentFrame);
  }

  // Drive overlay state based on frame position — called every frame during playback
  function updateOverlayState(sectionIndex: number, frameIdx: number) {
    // Section 0: intro logos + captions
    if (sectionIndex === 0) {
      const f = frameIdx;
      if (f < 10) { introPhase = "ummah"; introOpacity = f / 10; }
      else if (f < 50) { introPhase = "ummah"; introOpacity = 1; }
      else if (f < 65) { introPhase = "ummah"; introOpacity = 1 - (f - 50) / 15; }
      else if (f < 75) { introPhase = "salik"; introOpacity = (f - 65) / 10; }
      else if (f < 130) { introPhase = "salik"; introOpacity = 1; }
      else if (f < 145) { introPhase = "salik"; introOpacity = 1 - (f - 130) / 15; }
      else { introPhase = "done"; introOpacity = 0; }

      if (f < 165) { captionLines = 0; showHadith = false; }
      else if (f < 190) { captionLines = 1; showHadith = true; hadithDissolving = false; }
      else if (f < 215) { captionLines = 2; showHadith = true; hadithDissolving = false; }
      else { captionLines = 3; showHadith = true; hadithDissolving = false; }
    }

    // Section quotes
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
        sectionQuote = null;
        baalFadeProgress = 0;
      } else {
        sectionQuote = sectionIndex;
        quoteDissolving = false;
        baalFadeProgress = Math.min(1, (rel - cfg.threshold) / 15);
      }
    } else if (sectionIndex !== 0 && sectionQuote !== null) {
      sectionQuote = null;
      quoteDissolving = false;
    }
  }

  function playSection(sectionIndex: number, reverse = false): Promise<void> {
    return new Promise((resolve) => {
      if (sectionIndex < 0 || sectionIndex >= SECTIONS.length) { resolve(); return; }
      if (isPlaying) { resolve(); return; }

      isPlaying = true;
      showScrollHint = false;

      // Dissolve quotes when scrolling forward
      if (sectionQuote !== null && !reverse) {
        quoteDissolving = true;
        setTimeout(() => { sectionQuote = null; quoteDissolving = false; }, 1500);
      }
      // Dissolve captions when leaving section 0 forward
      if (showHadith && sectionIndex > 0 && !reverse) {
        hadithDissolving = true;
        setTimeout(() => { showHadith = false; hadithDissolving = false; captionLines = 0; }, 1500);
      }
      // Reversing into section 0
      if (sectionIndex === 0 && reverse) {
        hadithDissolving = false;
        showHadith = true;
        captionLines = 3;
      }

      const section = SECTIONS[sectionIndex];
      const startFrame = section.startFrame - 1;
      const endFrame = section.endFrame - 1;
      let frameIdx = reverse ? endFrame : startFrame;
      const FPS_INTERVAL = 1000 / 48;
      let lastTime = performance.now();

      // Preload
      for (let i = startFrame; i <= endFrame; i++) { updateCurrentFrame(i); }

      const playNext = (now: number) => {
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
              sectionQuote = prevSection;
              quoteDissolving = false;
            } else if (prevSection === 0) {
              showHadith = true; captionLines = 3; hadithDissolving = false;
            }
          } else {
            currentSectionIdx = sectionIndex;
            atSectionStart = reverse;
          }

          progress = reverse
            ? (sectionIndex > 0 ? SECTIONS[sectionIndex - 1].endFrame / TOTAL_FRAMES : (section.startFrame - 1) / TOTAL_FRAMES)
            : section.endFrame / TOTAL_FRAMES;

          if (sectionIndex === 0) {
            if (reverse) {
              introPhase = "ummah"; introOpacity = 0;
              showHadith = false; captionLines = 0;
            } else {
              introPhase = "done"; introOpacity = 0;
              showHadith = true; captionLines = 3;
            }
          }

          if (!(sectionIndex === 0 && reverse)) {
            showScrollHint = true;
            if (!reverse && sectionIndex > 0) {
              sectionQuote = sectionIndex;
              quoteDissolving = false;
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

          // Update overlay state every frame — Svelte only updates changed DOM nodes
          updateOverlayState(sectionIndex, frameIdx);
          progress = frameIdx / TOTAL_FRAMES;

          if (reverse) { frameIdx--; } else { frameIdx++; }
        }
        requestAnimationFrame(playNext);
      };
      requestAnimationFrame(playNext);
    });
  }

  function handleScroll(forward: boolean) {
    if (isPlaying || scrollCooldown) return;
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

  let touchStartY = 0;

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta > 10) handleScroll(true);
    else if (delta < -10) handleScroll(false);
  }

  function onTouchStart(e: TouchEvent) { touchStartY = e.touches[0].clientY; }

  function onTouchEnd(e: TouchEvent) {
    const diffY = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diffY) > 50) handleScroll(diffY > 0);
  }

  function onKeydown(e: KeyboardEvent) {
    if (isPlaying) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") handleScroll(true);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") handleScroll(false);
  }

  onMount(() => {
    initFrameLoader();

    // Wait for initial load — tick() ensures DOM has updated before accessing canvas
    const unsub = isInitialLoadComplete.subscribe(async (loaded) => {
      if (loaded) {
        await tick();
        if (canvasEl) {
          _ctx = canvasEl.getContext("2d", { alpha: false });
        }
        resizeCanvas();
        drawFrameAtIndex(0);
        setTimeout(() => playSection(0), 500);
        unsub();
      }
    });

    window.addEventListener("resize", resizeCanvas);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      document.body.style.overflow = "";
    };
  });
</script>

<svelte:window
  on:wheel|preventDefault={onWheel}
  on:touchstart={onTouchStart}
  on:touchend={onTouchEnd}
  on:keydown={onKeydown}
/>

{#if !$isInitialLoadComplete}
  <!-- Loading screen -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black">
    <div class="text-center text-white">
      <img src="/salik-foundation-logo.png" alt="Salik Foundation" class="mx-auto mb-6 h-12 opacity-60" />
      <div class="mb-4 text-sm tracking-[0.2em] uppercase text-white/50">Loading experience...</div>
      <div class="mx-auto h-1 w-48 overflow-hidden rounded-full bg-white/20">
        <div class="h-full rounded-full bg-[#4AB3E2]" style="width: 50%"></div>
      </div>
    </div>
  </div>
{:else}
  <div class="fixed inset-0" style="contain: layout style paint">
    <canvas
      bind:this={canvasEl}
      class="fixed left-0 top-0 w-screen h-screen"
      style="z-index: 2; will-change: contents;"
    ></canvas>

    <!-- Cinematic intro overlays -->
    {#if introPhase !== "none" && introPhase !== "done"}
      <div
        class="fixed inset-0 flex items-start justify-center pointer-events-none"
        style="z-index: 8; opacity: {introOpacity}; padding-top: 8vh;"
      >
        {#if introPhase === "ummah"}
          <div class="flex flex-col items-center gap-4">
            <p class="text-base md:text-lg tracking-[0.4em] uppercase" style="color: #ffffff; font-family: 'Montserrat', sans-serif; font-weight: 300; text-shadow: 0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5); letter-spacing: 0.4em;">
              Produced by
            </p>
            <img src="/ummah-media-logo.png" alt="Ummah Media Corporation" class="h-36 md:h-48" style="filter: drop-shadow(0 4px 30px rgba(0,0,0,0.8));" />
          </div>
        {/if}
        {#if introPhase === "salik"}
          <div class="flex flex-col items-center">
            <img src="/salik-foundation-full-logo.png" alt="Salik Foundation" class="h-40 md:h-56" style="filter: drop-shadow(0 4px 30px rgba(0,0,0,0.8));" />
          </div>
        {/if}
      </div>
    {/if}

    <!-- Section 0: 500 YEARS OF DARKNESS -->
    {#if showHadith}
      <div
        class="fixed inset-0 flex items-center justify-center pointer-events-none"
        class:caption-dissolve={hadithDissolving}
        style="z-index: 9;"
      >
        <div class="text-center px-8 max-w-4xl flex flex-col items-center gap-2">
          <h2 style="color: #FFFFFF; font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: clamp(3rem, 10vw, 8rem); line-height: 0.95; letter-spacing: 0.04em; text-shadow: 0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9); opacity: {captionLines >= 1 ? 1 : 0}; transform: translateY({captionLines >= 1 ? 0 : 20}px); transition: opacity 0.8s ease-out, transform 0.8s ease-out; margin: 0;">
            500 Years
          </h2>
          <h2 style="color: #FFFFFF; font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: clamp(3rem, 10vw, 8rem); line-height: 0.95; letter-spacing: 0.04em; text-shadow: 0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9); opacity: {captionLines >= 2 ? 1 : 0}; transform: translateY({captionLines >= 2 ? 0 : 20}px); transition: opacity 0.8s ease-out, transform 0.8s ease-out; margin: 0;">
            Of Darkness
          </h2>
          <p class="mt-4" style="color: #F0D878; font-family: Georgia, serif; font-style: italic; font-size: clamp(1rem, 2.5vw, 1.5rem); text-shadow: 0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9); opacity: {captionLines >= 3 ? 1 : 0}; transform: translateY({captionLines >= 3 ? 0 : 15}px); transition: opacity 1.2s ease-out, transform 1.2s ease-out; letter-spacing: 0.15em;">
            No law. No scripture. No guidance.
          </p>
        </div>
      </div>
    {/if}

    <!-- Section quotes -->
    {#if sectionQuote !== null}
      <div class="fixed inset-0 pointer-events-none" class:caption-dissolve={quoteDissolving} style="z-index: 9;">

        {#if sectionQuote === 1}
          <div class="absolute top-0" style="left: 25vw; padding-top: 8vh; max-width: 650px; opacity: {quoteDissolving ? 1 : baalFadeProgress}; transform: translateY({quoteDissolving ? 0 : (1 - baalFadeProgress) * 15}px);">
            <h2 style="color: #FFFFFF; font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.5rem, 7vw, 5.5rem); line-height: 0.95; letter-spacing: 0.04em; text-align: left; text-shadow: 0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9); margin: 0;">
              They Bowed<br/>To Stone
            </h2>
            <p class="mt-4" style="color: #F0D878; font-family: Georgia, serif; font-style: italic; font-size: clamp(0.9rem, 2vw, 1.3rem); text-align: left; text-shadow: 0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9); line-height: 1.5;">
              &ldquo;Do you call upon Baal and abandon the Best of Creators &mdash;<br/>Allah, your Lord and the Lord of your forefathers?&rdquo;
            </p>
            <p class="mt-2 text-xs md:text-sm tracking-[0.2em] uppercase" style="color: rgba(240,216,120,0.4); font-family: 'Montserrat', sans-serif; font-weight: 300; text-align: left; text-shadow: 0 2px 20px rgba(0,0,0,0.9);">
              Qur&rsquo;an 37:125-126
            </p>
          </div>
        {/if}

        {#if sectionQuote === 2}
          <div class="flex flex-col items-center pt-[2vh]" style="opacity: {quoteDissolving ? 1 : baalFadeProgress}; transform: translateY({quoteDissolving ? 0 : (1 - baalFadeProgress) * 20}px);">
            <img src="/quran-open.webp" alt="The Holy Qur'an" class="h-48 md:h-64 lg:h-80 mb-6" style="filter: drop-shadow(0 0 40px rgba(200,168,78,0.4)) drop-shadow(0 4px 20px rgba(0,0,0,0.8));" />
            <h2 style="color: #FFFFFF; font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.5rem, 8vw, 6rem); line-height: 0.95; letter-spacing: 0.04em; text-shadow: 0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9); margin: 0; text-align: center;">
              Allah&rsquo;s Mercy<br/>Sent Light
            </h2>
            <p class="mt-4" style="color: #F0D878; font-family: Georgia, serif; font-style: italic; font-size: clamp(0.9rem, 2vw, 1.3rem); text-shadow: 0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9); line-height: 1.7; text-align: center; max-width: 600px; padding: 0 2rem;">
              &ldquo;A Book sent down to bring mankind<br/>out of darkness and into light.&rdquo;
            </p>
            <p class="mt-2 text-xs md:text-sm tracking-[0.3em] uppercase" style="color: rgba(240,216,120,0.4); font-family: 'Montserrat', sans-serif; font-weight: 300; text-shadow: 0 2px 20px rgba(0,0,0,0.9);">
              Qur&rsquo;an 14:1
            </p>
          </div>
        {/if}

        {#if sectionQuote === 3}
          <div class="flex flex-col items-center justify-center" style="height: 100vh; opacity: {quoteDissolving ? 1 : baalFadeProgress}; transform: translateY({quoteDissolving ? 0 : (1 - baalFadeProgress) * 20}px);">
            <h2 style="color: #FFFFFF; font-family: 'Bebas Neue', sans-serif; font-size: clamp(3.5rem, 12vw, 9rem); line-height: 0.95; letter-spacing: 0.04em; text-shadow: 0 0 50px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9); margin: 0; text-align: center;">
              Everything<br/>Changed
            </h2>
            <p class="mt-4" style="color: #F0D878; font-family: Georgia, serif; font-style: italic; font-size: clamp(1rem, 2.5vw, 1.5rem); text-shadow: 0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9); text-align: center; letter-spacing: 0.1em;">
              One revelation. One message. One God.
            </p>
          </div>
        {/if}

        {#if sectionQuote === 4}
          <div class="flex flex-col items-center justify-center" style="height: 100vh; opacity: {quoteDissolving ? 1 : baalFadeProgress}; transform: translateY({quoteDissolving ? 0 : (1 - baalFadeProgress) * 20}px);">
            <h2 style="color: #FFFFFF; font-family: 'Bebas Neue', sans-serif; font-size: clamp(3rem, 10vw, 8rem); line-height: 0.95; letter-spacing: 0.04em; text-shadow: 0 0 50px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.9); margin: 0; text-align: center;">
              The World<br/>Listened
            </h2>
            <p class="mt-4" style="color: #F0D878; font-family: Georgia, serif; font-style: italic; font-size: clamp(1rem, 2.5vw, 1.5rem); text-shadow: 0 0 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9); text-align: center; letter-spacing: 0.08em; max-width: 600px; padding: 0 2rem;">
              The message crossed every ocean, every mountain, every border.
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Scroll HUD -->
    <div class="fixed bottom-12 left-0 right-0 flex justify-center pointer-events-none" style="z-index: 10; opacity: {showScrollHint ? 1 : 0}; transition: opacity 1.5s ease;">
      <div class="flex flex-col items-center select-none" style="animation: cutsceneFloat 3s ease-in-out infinite;">
        <div class="flex items-center gap-5 mb-4">
          <div style="width: 120px; height: 2px; background: linear-gradient(to right, transparent, #E8D080); box-shadow: 0 0 12px rgba(232,208,128,0.6); animation: lineGlow 2.5s ease-in-out infinite;"></div>
          <span class="text-3xl md:text-4xl tracking-[0.5em] uppercase" style="color: #F0D878; font-family: 'Montserrat', sans-serif; font-weight: 700; text-shadow: 0 0 25px rgba(240,216,120,0.9), 0 0 50px rgba(240,216,120,0.5), 0 0 80px rgba(200,168,78,0.3), 0 2px 6px rgba(0,0,0,0.9); animation: textGlow 2.5s ease-in-out infinite;">
            Scroll
          </span>
          <div style="width: 120px; height: 2px; background: linear-gradient(to left, transparent, #E8D080); box-shadow: 0 0 12px rgba(232,208,128,0.6); animation: lineGlow 2.5s ease-in-out infinite;"></div>
        </div>
        <div class="flex flex-col items-center" style="gap: 3px;">
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" style="animation: chevronCascade 1.8s ease-in-out infinite; filter: drop-shadow(0 0 12px rgba(240,216,120,0.8));">
            <path d="M6 4L20 16L34 4" stroke="#F0D878" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" style="animation: chevronCascade 1.8s ease-in-out 0.2s infinite; filter: drop-shadow(0 0 12px rgba(240,216,120,0.6));">
            <path d="M6 4L20 16L34 4" stroke="#F0D878" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" style="animation: chevronCascade 1.8s ease-in-out 0.4s infinite; filter: drop-shadow(0 0 12px rgba(240,216,120,0.4));">
            <path d="M6 4L20 16L34 4" stroke="#F0D878" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Progress bar -->
    {#if progress > 0.05 && progress < 0.9}
      <div class="fixed bottom-0 left-0 right-0 z-20 h-[2px]" style="opacity: {progress < 0.1 ? (progress - 0.05) / 0.05 : progress > 0.85 ? (0.9 - progress) / 0.05 : 1}; will-change: opacity;">
        <div class="h-full bg-white/40" style="width: {progress * 100}%; will-change: width; transition: width 80ms linear;"></div>
      </div>
    {/if}
  </div>
{/if}

<style>
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
    0% { opacity: 1; transform: translateY(0); filter: blur(0px); }
    100% { opacity: 0; transform: translateY(-30px); filter: blur(4px); }
  }
  :global(.caption-dissolve p:nth-child(1)) { animation: captionDissolveOut 1.2s ease-in forwards; }
  :global(.caption-dissolve p:nth-child(2)) { animation: captionDissolveOut 1.2s ease-in 0.15s forwards; }
  :global(.caption-dissolve p:nth-child(3)) { animation: captionDissolveOut 1.2s ease-in 0.3s forwards; }
  :global(.caption-dissolve h2:nth-child(1)) { animation: captionDissolveOut 1.2s ease-in forwards; }
  :global(.caption-dissolve h2:nth-child(2)) { animation: captionDissolveOut 1.2s ease-in 0.15s forwards; }
</style>
