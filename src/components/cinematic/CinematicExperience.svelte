<script lang="ts">
  import ScrollCanvas from "./ScrollCanvas.svelte";
</script>

<main>
  <ScrollCanvas />

  <!-- Floating nav — Bebas Neue, evenly spaced across top -->
  <div class="pointer-events-none fixed left-0 right-0 top-0 z-30 flex items-center px-6 md:px-12 py-5">
    <a href="/" class="pointer-events-auto shrink-0">
      <img src="/salik-foundation-logo.png" alt="Salik Foundation" class="h-8 md:h-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
    </a>
    <div class="pointer-events-auto hidden flex-1 items-center justify-evenly md:flex" style="font-family: 'Bebas Neue', sans-serif;">
      <a href="/about" class="nav-link">About</a>
      <a href="/programs" class="nav-link">Programs</a>
      <a href="/contact" class="nav-link">Contact</a>
      <a
        href="https://www.canadahelps.org/en/charities/salik-foundation/"
        target="_blank"
        rel="noopener noreferrer"
        class="nav-link rounded-sm border border-[#C8A84E]/50 bg-black/20 px-6 py-2 backdrop-blur-sm hover:bg-[#C8A84E]/20 hover:border-[#C8A84E]"
      >
        Donate
      </a>
    </div>
  </div>
</main>

<style>
  .nav-link {
    color: #C8A84E;
    font-size: 1.4rem;
    letter-spacing: 0.12em;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.6);
    transition: all 0.2s;
  }
  .nav-link:hover {
    color: white;
    transform: scale(1.05);
  }
</style>
