// src/lib/frames.ts

export interface Section {
  id: number;
  name: string;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  textOverlay: string | null;
}

export const TOTAL_FRAMES = 1200;
export const INITIAL_BATCH_SIZE = 30;
export const BATCH_SIZE = 30;
export const LOOK_AHEAD = 60;
export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 500;
export const FALLBACK_TIMEOUT_MS = 10_000;
export const FLASH_FRAME_COUNT = 114;

export const SECTIONS: Section[] = [
  { id: 1, name: "The Letterbox Open", startFrame: 1, endFrame: 120, frameCount: 120, textOverlay: "OUTFITTER" },
  { id: 2, name: "The Call", startFrame: 121, endFrame: 240, frameCount: 120, textOverlay: "Every hunter carries a dream" },
  { id: 3, name: "The Arrival", startFrame: 241, endFrame: 360, frameCount: 120, textOverlay: "The journey begins" },
  { id: 4, name: "Base Camp", startFrame: 361, endFrame: 480, frameCount: 120, textOverlay: "Your guide knows this land" },
  { id: 5, name: "The Ride Out", startFrame: 481, endFrame: 600, frameCount: 120, textOverlay: "Before first light" },
  { id: 6, name: "Glassing", startFrame: 601, endFrame: 720, frameCount: 120, textOverlay: "Patience is the weapon" },
  { id: 7, name: "The Stalk", startFrame: 721, endFrame: 840, frameCount: 120, textOverlay: "Close the distance" },
  { id: 8, name: "The Moment", startFrame: 841, endFrame: 960, frameCount: 120, textOverlay: null },
  { id: 9, name: "Crosshair Hold", startFrame: 961, endFrame: 1080, frameCount: 120, textOverlay: null },
  { id: 10, name: "Take the Shot", startFrame: 1081, endFrame: 1200, frameCount: 120, textOverlay: null },
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
