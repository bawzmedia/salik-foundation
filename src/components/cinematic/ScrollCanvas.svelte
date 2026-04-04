<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { createCanvasEngine } from "../../lib/canvasEngine";
  import { isInitialLoadComplete } from "../../stores/frameLoader";

  let showScrollHint = false;
  let introPhase = "none";
  let introOpacity = 0;
  let showHadith = false;
  let hadithDissolving = false;
  let captionLines = 0;
  let sectionQuote: number | null = null;
  let quoteDissolving = false;
  let baalFadeProgress = 0;
  let progress = 0;

  let canvasEl: HTMLCanvasElement;
  let engine: ReturnType<typeof createCanvasEngine> | null = null;

  // Svelte action — called when canvas mounts
  function initCanvas(node: HTMLCanvasElement) {
    engine = createCanvasEngine(node, {
      onShowScrollHint: (show) => { showScrollHint = show; },
      onIntroPhase: (phase, opacity) => { introPhase = phase; introOpacity = opacity; },
      onCaptionLines: (lines, show, dissolving) => {
        captionLines = lines;
        showHadith = show;
        hadithDissolving = dissolving;
      },
      onSectionQuote: (quote, dissolving, fade) => {
        sectionQuote = quote;
        quoteDissolving = dissolving;
        baalFadeProgress = fade;
      },
      onProgress: (p) => { progress = p; },
    });

    return {
      destroy() {
        engine?.destroy();
      }
    };
  }
</script>

{#if !$isInitialLoadComplete}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black">
    <div class="text-center text-white">
      <img src="/salik-foundation-logo.png" alt="Salik Foundation" class="mx-auto mb-6 h-12 opacity-60" />
      <div class="mb-4 text-sm tracking-[0.2em] uppercase text-white/50">Loading experience...</div>
      <div class="mx-auto h-1 w-48 overflow-hidden rounded-full bg-white/20">
        <div class="h-full rounded-full bg-[#4AB3E2]" style="width: 50%"></div>
      </div>
    </div>
  </div>
{/if}

<div class="fixed inset-0" style="contain: layout style paint">
  <canvas
    use:initCanvas
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
        <svg width="40" height="20" viewBox="0 0 40 20" fill="none" style="animation: chevronCascade 1.8s ease-in-out infinite; filter: drop-shadow(0 0 12px rgba(240,216,120,0.8));"><path d="M6 4L20 16L34 4" stroke="#F0D878" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <svg width="40" height="20" viewBox="0 0 40 20" fill="none" style="animation: chevronCascade 1.8s ease-in-out 0.2s infinite; filter: drop-shadow(0 0 12px rgba(240,216,120,0.6));"><path d="M6 4L20 16L34 4" stroke="#F0D878" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <svg width="40" height="20" viewBox="0 0 40 20" fill="none" style="animation: chevronCascade 1.8s ease-in-out 0.4s infinite; filter: drop-shadow(0 0 12px rgba(240,216,120,0.4));"><path d="M6 4L20 16L34 4" stroke="#F0D878" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
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

<style>
  @keyframes cutsceneFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes chevronCascade { 0% { opacity: 0.1; transform: translateY(-4px); } 40% { opacity: 1; transform: translateY(0); } 70% { opacity: 0.5; transform: translateY(4px); } 100% { opacity: 0.1; transform: translateY(6px); } }
  @keyframes textGlow { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
  @keyframes lineGlow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
  @keyframes captionDissolveOut { 0% { opacity: 1; transform: translateY(0); filter: blur(0px); } 100% { opacity: 0; transform: translateY(-30px); filter: blur(4px); } }
  :global(.caption-dissolve p) { animation: captionDissolveOut 1.2s ease-in forwards; }
  :global(.caption-dissolve h2) { animation: captionDissolveOut 1.2s ease-in forwards; }
  :global(.caption-dissolve p:nth-child(2)) { animation-delay: 0.15s; }
  :global(.caption-dissolve p:nth-child(3)) { animation-delay: 0.3s; }
  :global(.caption-dissolve h2:nth-child(2)) { animation-delay: 0.15s; }
</style>
