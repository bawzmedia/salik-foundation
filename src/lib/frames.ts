export interface Section {
  id: number;
  name: string;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  textOverlay: string[] | null;
  era: string;
  colorAccent: string;
}

export const TOTAL_FRAMES = 840; // 7 eras × 120 frames each
export const INITIAL_BATCH_SIZE = 30;
export const BATCH_SIZE = 30;
export const LOOK_AHEAD = 60;
export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 500;
export const FALLBACK_TIMEOUT_MS = 10_000;
export const FRAMES_PER_ERA = 120;

export const SECTIONS: Section[] = [
  {
    id: 1,
    name: "The Norsemen",
    era: "Scandinavia, 10th Century",
    startFrame: 1,
    endFrame: 120,
    frameCount: 120,
    textOverlay: [
      "In the frozen north, where longships carved through ice...",
      "Vikings traded silver — and found something worth more than gold.",
    ],
    colorAccent: "#7BA7BC", // ice blue
  },
  {
    id: 2,
    name: "The Empire of Gold",
    era: "West Africa, 13th–14th Century",
    startFrame: 121,
    endFrame: 240,
    frameCount: 120,
    textOverlay: [
      "An empire so rich, one man's journey crashed the gold markets of three continents...",
      "And his sailors may have reached the Americas — centuries before Columbus.",
    ],
    colorAccent: "#D4A843", // gold
  },
  {
    id: 3,
    name: "The Silk Road & the Middle Kingdom",
    era: "China, 7th–14th Century",
    startFrame: 241,
    endFrame: 360,
    frameCount: 120,
    textOverlay: [
      "While Europe sailed in wooden boats, a Chinese Muslim admiral commanded 300 ships...",
      "The message traveled the Silk Road — and sailed the seven seas.",
    ],
    colorAccent: "#4A8C5C", // jade green
  },
  {
    id: 4,
    name: "The Moors",
    era: "Al-Andalus & Europe, 8th–15th Century",
    startFrame: 361,
    endFrame: 480,
    frameCount: 120,
    textOverlay: [
      "When Europe was in darkness, the Moors lit it with knowledge...",
      "The words you speak today — algebra, chemistry, zenith — are their legacy.",
    ],
    colorAccent: "#C47A5A", // terracotta
  },
  {
    id: 5,
    name: "The Island Archipelago",
    era: "Southeast Asia, 13th–16th Century",
    startFrame: 481,
    endFrame: 600,
    frameCount: 120,
    textOverlay: [
      "Not by the sword. Not by force. By character alone...",
      "Today, 230 million Muslims in one nation — because traders lived the message.",
    ],
    colorAccent: "#3AAFA9", // ocean turquoise
  },
  {
    id: 6,
    name: "The New World",
    era: "Americas & the Modern Ummah, 15th Century–Today",
    startFrame: 601,
    endFrame: 720,
    frameCount: 120,
    textOverlay: [
      "They crossed oceans in chains — and still they prayed...",
      "From every nation. Every tongue. Every corner of the earth.",
    ],
    colorAccent: "#8B7355", // sepia
  },
  {
    id: 7,
    name: "Your Chapter",
    era: "Salik Foundation, Today",
    startFrame: 721,
    endFrame: 840,
    frameCount: 120,
    textOverlay: [
      "Vikings. Emperors. Admirals. Scholars. Traders. Survivors.",
      "Every one of them answered the call.",
      "Now it's your chapter.",
    ],
    colorAccent: "#4AB3E2", // salik blue
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
