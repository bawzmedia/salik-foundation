export interface Section {
  id: number;
  name: string;
  scene: string;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  textOverlay: string[] | null;
  era: string;
  eraNumber: number;
  colorAccent: string;
}

export const TOTAL_FRAMES = 2520; // 7 eras × 3 scenes × 120 frames
export const INITIAL_BATCH_SIZE = 30;
export const BATCH_SIZE = 30;
export const LOOK_AHEAD = 60;
export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 500;
export const FALLBACK_TIMEOUT_MS = 10_000;
export const FRAMES_PER_SCENE = 120;
export const SCENES_PER_ERA = 3;

export const SECTIONS: Section[] = [
  // ── ERA 1: The Norsemen ──
  {
    id: 1, eraNumber: 1, name: "The Norsemen", scene: "The Fjord at Dawn",
    era: "Scandinavia, 10th Century",
    startFrame: 1, endFrame: 120, frameCount: 120,
    textOverlay: null,
    colorAccent: "#7BA7BC",
  },
  {
    id: 2, eraNumber: 1, name: "The Norsemen", scene: "The Warriors and the Artifact",
    era: "Scandinavia, 10th Century",
    startFrame: 121, endFrame: 240, frameCount: 120,
    textOverlay: [
      "In the frozen north, where longships carved through ice...",
      "Vikings traded silver — and found something worth more than gold.",
    ],
    colorAccent: "#7BA7BC",
  },
  {
    id: 3, eraNumber: 1, name: "The Norsemen", scene: "Ice to Sand",
    era: "Scandinavia, 10th Century",
    startFrame: 241, endFrame: 360, frameCount: 120,
    textOverlay: null,
    colorAccent: "#7BA7BC",
  },

  // ── ERA 2: The Empire of Gold ──
  {
    id: 4, eraNumber: 2, name: "The Empire of Gold", scene: "Mansa Musa's Caravan",
    era: "West Africa, 13th–14th Century",
    startFrame: 361, endFrame: 480, frameCount: 120,
    textOverlay: null,
    colorAccent: "#D4A843",
  },
  {
    id: 5, eraNumber: 2, name: "The Empire of Gold", scene: "The Libraries of Timbuktu",
    era: "West Africa, 13th–14th Century",
    startFrame: 481, endFrame: 600, frameCount: 120,
    textOverlay: [
      "An empire so rich, one man's journey crashed the gold markets of three continents...",
      "And his sailors may have reached the Americas — centuries before Columbus.",
    ],
    colorAccent: "#D4A843",
  },
  {
    id: 6, eraNumber: 2, name: "The Empire of Gold", scene: "Gold Dust to Ocean",
    era: "West Africa, 13th–14th Century",
    startFrame: 601, endFrame: 720, frameCount: 120,
    textOverlay: null,
    colorAccent: "#D4A843",
  },

  // ── ERA 3: The Silk Road & the Middle Kingdom ──
  {
    id: 7, eraNumber: 3, name: "The Silk Road", scene: "Zheng He's Treasure Fleet",
    era: "China, 7th–14th Century",
    startFrame: 721, endFrame: 840, frameCount: 120,
    textOverlay: null,
    colorAccent: "#4A8C5C",
  },
  {
    id: 8, eraNumber: 3, name: "The Silk Road", scene: "The Xi'an Mosque",
    era: "China, 7th–14th Century",
    startFrame: 841, endFrame: 960, frameCount: 120,
    textOverlay: [
      "While Europe sailed in wooden boats, a Chinese Muslim admiral commanded 300 ships...",
      "The message traveled the Silk Road — and sailed the seven seas.",
    ],
    colorAccent: "#4A8C5C",
  },
  {
    id: 9, eraNumber: 3, name: "The Silk Road", scene: "Silk to Geometric Tiles",
    era: "China, 7th–14th Century",
    startFrame: 961, endFrame: 1080, frameCount: 120,
    textOverlay: null,
    colorAccent: "#4A8C5C",
  },

  // ── ERA 4: The Moors ──
  {
    id: 10, eraNumber: 4, name: "The Moors", scene: "The Great Mosque of Cordoba",
    era: "Al-Andalus & Europe, 8th–15th Century",
    startFrame: 1081, endFrame: 1200, frameCount: 120,
    textOverlay: null,
    colorAccent: "#C47A5A",
  },
  {
    id: 11, eraNumber: 4, name: "The Moors", scene: "The Scholars of Toledo",
    era: "Al-Andalus & Europe, 8th–15th Century",
    startFrame: 1201, endFrame: 1320, frameCount: 120,
    textOverlay: [
      "When Europe was in darkness, the Moors lit it with knowledge...",
      "The words you speak today — algebra, chemistry, zenith — are their legacy.",
    ],
    colorAccent: "#C47A5A",
  },
  {
    id: 12, eraNumber: 4, name: "The Moors", scene: "Geometry to Tropics",
    era: "Al-Andalus & Europe, 8th–15th Century",
    startFrame: 1321, endFrame: 1440, frameCount: 120,
    textOverlay: null,
    colorAccent: "#C47A5A",
  },

  // ── ERA 5: The Island Archipelago ──
  {
    id: 13, eraNumber: 5, name: "The Island Archipelago", scene: "The Trading Port",
    era: "Southeast Asia, 13th–16th Century",
    startFrame: 1441, endFrame: 1560, frameCount: 120,
    textOverlay: null,
    colorAccent: "#3AAFA9",
  },
  {
    id: 14, eraNumber: 5, name: "The Island Archipelago", scene: "Prayer at Sunset",
    era: "Southeast Asia, 13th–16th Century",
    startFrame: 1561, endFrame: 1680, frameCount: 120,
    textOverlay: [
      "Not by the sword. Not by force. By character alone...",
      "Today, 230 million Muslims in one nation — because traders lived the message.",
    ],
    colorAccent: "#3AAFA9",
  },
  {
    id: 15, eraNumber: 5, name: "The Island Archipelago", scene: "Sunset to Sepia",
    era: "Southeast Asia, 13th–16th Century",
    startFrame: 1681, endFrame: 1800, frameCount: 120,
    textOverlay: null,
    colorAccent: "#3AAFA9",
  },

  // ── ERA 6: The New World ──
  {
    id: 16, eraNumber: 6, name: "The New World", scene: "Malian Sailors on the Atlantic",
    era: "Americas & the Modern Ummah, 15th Century–Today",
    startFrame: 1801, endFrame: 1920, frameCount: 120,
    textOverlay: null,
    colorAccent: "#8B7355",
  },
  {
    id: 17, eraNumber: 6, name: "The New World", scene: "Faith in Chains",
    era: "Americas & the Modern Ummah, 15th Century–Today",
    startFrame: 1921, endFrame: 2040, frameCount: 120,
    textOverlay: [
      "They crossed oceans in chains — and still they prayed...",
      "From every nation. Every tongue. Every corner of the earth.",
    ],
    colorAccent: "#8B7355",
  },
  {
    id: 18, eraNumber: 6, name: "The New World", scene: "The Modern Ummah",
    era: "Americas & the Modern Ummah, 15th Century–Today",
    startFrame: 2041, endFrame: 2160, frameCount: 120,
    textOverlay: null,
    colorAccent: "#8B7355",
  },

  // ── ERA 7: Your Chapter ──
  {
    id: 19, eraNumber: 7, name: "Your Chapter", scene: "Children and the Qur'an",
    era: "Salik Foundation, Today",
    startFrame: 2161, endFrame: 2280, frameCount: 120,
    textOverlay: [
      "Vikings. Emperors. Admirals. Scholars. Traders. Survivors.",
      "Every one of them answered the call.",
    ],
    colorAccent: "#4AB3E2",
  },
  {
    id: 20, eraNumber: 7, name: "Your Chapter", scene: "Orphan Care",
    era: "Salik Foundation, Today",
    startFrame: 2281, endFrame: 2400, frameCount: 120,
    textOverlay: [
      "Now it's your chapter.",
    ],
    colorAccent: "#4AB3E2",
  },
  {
    id: 21, eraNumber: 7, name: "Your Chapter", scene: "Fade to Black",
    era: "Salik Foundation, Today",
    startFrame: 2401, endFrame: 2520, frameCount: 120,
    textOverlay: null,
    colorAccent: "#4AB3E2",
  },
];

// Group sections by era for the scroll experience
export const ERAS = [1, 2, 3, 4, 5, 6, 7].map((eraNum) => ({
  eraNumber: eraNum,
  sections: SECTIONS.filter((s) => s.eraNumber === eraNum),
  name: SECTIONS.find((s) => s.eraNumber === eraNum)!.name,
  era: SECTIONS.find((s) => s.eraNumber === eraNum)!.era,
  colorAccent: SECTIONS.find((s) => s.eraNumber === eraNum)!.colorAccent,
  textOverlay: SECTIONS.filter((s) => s.eraNumber === eraNum && s.textOverlay).flatMap((s) => s.textOverlay!),
}));

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
