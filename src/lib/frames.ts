// src/lib/frames.ts

export interface Section {
  id: number;
  name: string;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  textOverlay: string | null;
}

export const TOTAL_FRAMES = 785;
export const INITIAL_BATCH_SIZE = 10;
export const BATCH_SIZE = 30;
export const LOOK_AHEAD = 60;
export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 500;
export const FALLBACK_TIMEOUT_MS = 10_000;
export const TARGET_FPS = 30;
export const FLASH_FRAME_COUNT = 0;

export const SECTIONS: Section[] = [
  // ── PROLOGUE: Pre-Islamic Arabia ──
  // Clips 1+2 merged — continuous, no stopping
  {
    id: 1,
    name: "The Age of Ignorance",
    startFrame: 1,
    endFrame: 241,
    frameCount: 241,
    textOverlay: null,
  },

  // ── Clip 3: A World Waiting ──
  {
    id: 2,
    name: "A World Waiting",
    startFrame: 242,
    endFrame: 392,
    frameCount: 151,
    textOverlay: null,
  },

  // ── Clip 4: The Qur'an Descends ──
  {
    id: 3,
    name: "The Qur'an Descends",
    startFrame: 393,
    endFrame: 543,
    frameCount: 151,
    textOverlay: null,
  },

  // ── Clip 5: Transformation of Arabia ──
  {
    id: 4,
    name: "The Transformation of Arabia",
    startFrame: 544,
    endFrame: 664,
    frameCount: 121,
    textOverlay: null,
  },

  // ── Clip 6: The Message Reaches the World ──
  {
    id: 5,
    name: "The Message Reaches the World",
    startFrame: 665,
    endFrame: 785,
    frameCount: 121,
    textOverlay: null,
  },
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
