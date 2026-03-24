// src/lib/frames.ts

export interface Section {
  id: number;
  name: string;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  textOverlay: string | null;
}

export const TOTAL_FRAMES = 2520; // 21 sections × 120 frames
export const INITIAL_BATCH_SIZE = 30;
export const BATCH_SIZE = 30;
export const LOOK_AHEAD = 60;
export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 500;
export const FALLBACK_TIMEOUT_MS = 10_000;
export const FLASH_FRAME_COUNT = 0; // No flash sequence for Salik

export const SECTIONS: Section[] = [
  // ── ERA 1: The Norsemen ──
  { id: 1, name: "The Volga Trade Route", startFrame: 1, endFrame: 120, frameCount: 120, textOverlay: null },
  { id: 2, name: "The Inscription", startFrame: 121, endFrame: 240, frameCount: 120, textOverlay: "In the frozen north, where longships carved through ice...\nVikings traded silver — and found something worth more than gold." },
  { id: 3, name: "Ice to Sand", startFrame: 241, endFrame: 360, frameCount: 120, textOverlay: null },

  // ── ERA 2: The Empire of Gold ──
  { id: 4, name: "Mansa Musa's Caravan", startFrame: 361, endFrame: 480, frameCount: 120, textOverlay: null },
  { id: 5, name: "The Scribes of Timbuktu", startFrame: 481, endFrame: 600, frameCount: 120, textOverlay: "An empire so rich, one man's journey crashed the gold markets of three continents...\nAnd his sailors may have reached the Americas — centuries before Columbus." },
  { id: 6, name: "Pages on the Wind", startFrame: 601, endFrame: 720, frameCount: 120, textOverlay: null },

  // ── ERA 3: The Silk Road ──
  { id: 7, name: "Dawah at the Oasis", startFrame: 721, endFrame: 840, frameCount: 120, textOverlay: null },
  { id: 8, name: "Zheng He Reads the Qur'an", startFrame: 841, endFrame: 960, frameCount: 120, textOverlay: "While Europe sailed in wooden boats, a Chinese Muslim admiral commanded 300 ships...\nThe message traveled the Silk Road — and sailed the seven seas." },
  { id: 9, name: "Silk to Stone", startFrame: 961, endFrame: 1080, frameCount: 120, textOverlay: null },

  // ── ERA 4: The Moors ──
  { id: 10, name: "Recitation in Cordoba", startFrame: 1081, endFrame: 1200, frameCount: 120, textOverlay: null },
  { id: 11, name: "Faith and Knowledge United", startFrame: 1201, endFrame: 1320, frameCount: 120, textOverlay: "When Europe was in darkness, the Moors lit it with knowledge...\nThe words you speak today — algebra, chemistry, zenith — are their legacy." },
  { id: 12, name: "Tiles to Leaves", startFrame: 1321, endFrame: 1440, frameCount: 120, textOverlay: null },

  // ── ERA 5: The Island Archipelago ──
  { id: 13, name: "Teaching Under the Tree", startFrame: 1441, endFrame: 1560, frameCount: 120, textOverlay: null },
  { id: 14, name: "First Prayer at the Wooden Mosque", startFrame: 1561, endFrame: 1680, frameCount: 120, textOverlay: "Not by the sword. Not by force. By character alone...\nToday, 230 million Muslims in one nation — because traders lived the message." },
  { id: 15, name: "Memory Fades to Sepia", startFrame: 1681, endFrame: 1800, frameCount: 120, textOverlay: null },

  // ── ERA 6: The New World ──
  { id: 16, name: "The Qur'an from Memory", startFrame: 1801, endFrame: 1920, frameCount: 120, textOverlay: null },
  { id: 17, name: "Prayer Through the Ages", startFrame: 1921, endFrame: 2040, frameCount: 120, textOverlay: "They crossed oceans in chains — and still they prayed...\nFrom every nation. Every tongue. Every corner of the earth." },
  { id: 18, name: "The Ummah Today", startFrame: 2041, endFrame: 2160, frameCount: 120, textOverlay: null },

  // ── ERA 7: Your Chapter ──
  { id: 19, name: "Qur'an Distribution", startFrame: 2161, endFrame: 2280, frameCount: 120, textOverlay: "Vikings. Emperors. Admirals. Scholars. Traders. Survivors.\nEvery one of them answered the call." },
  { id: 20, name: "Caring for the Orphan", startFrame: 2281, endFrame: 2400, frameCount: 120, textOverlay: "Now it's your chapter." },
  { id: 21, name: "Fade to Black", startFrame: 2401, endFrame: 2520, frameCount: 120, textOverlay: null },
];

export type ResolutionTier = "desktop" | "mobile";
export const MOBILE_BREAKPOINT = 768;

export function getResolutionTier(viewportWidth: number): ResolutionTier {
  return viewportWidth <= MOBILE_BREAKPOINT ? "mobile" : "desktop";
}

export function getFramePath(frameNumber: number, tier: ResolutionTier): string {
  const padded = String(frameNumber).padStart(4, "0");
  return `/frames/${tier}/frame-${padded}.webp`;
}

export function getFlashFramePath(frameNumber: number): string {
  const padded = String(frameNumber).padStart(3, "0");
  return `/frames/flash/flash-${padded}.webp`;
}

export function progressToFrame(progress: number): number {
  return Math.min(Math.floor(progress * TOTAL_FRAMES), TOTAL_FRAMES - 1);
}

export function frameToProgress(frame: number): number {
  return frame / TOTAL_FRAMES;
}

export function getSectionAtFrame(frame: number): Section | undefined {
  return SECTIONS.find((s) => frame >= s.startFrame && frame <= s.endFrame);
}

export function getSectionProgress(section: Section): { start: number; end: number } {
  return {
    start: (section.startFrame - 1) / TOTAL_FRAMES,
    end: section.endFrame / TOTAL_FRAMES,
  };
}
