import { writable, get } from "svelte/store";
import {
  TOTAL_FRAMES,
  BATCH_SIZE,
  LOOK_AHEAD,
  MAX_RETRIES,
  RETRY_DELAY_MS,
  FALLBACK_TIMEOUT_MS,
  getFramePath,
  getResolutionTier,
} from "@/lib/frames";

// Mutable arrays — not reactive, accessed directly
export const frames: (HTMLImageElement | null)[] = new Array(TOTAL_FRAMES).fill(null);

// Reactive stores for UI state only
export const isInitialLoadComplete = writable(false);
export const isFallback = writable(false);

const loadedBatches = new Set<number>();
let tier: "desktop" | "mobile" = "desktop";

function loadImageWithRetry(
  src: string,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (retries > 0) {
        setTimeout(() => {
          loadImageWithRetry(src, retries - 1, delay * 1.5).then(resolve).catch(reject);
        }, delay);
      } else {
        reject(new Error(`Failed to load: ${src}`));
      }
    };
    img.src = src;
  });
}

async function loadBatch(batchIndex: number): Promise<void> {
  if (loadedBatches.has(batchIndex)) return;
  loadedBatches.add(batchIndex);

  const startFrame = batchIndex * BATCH_SIZE + 1;
  const endFrame = Math.min(startFrame + BATCH_SIZE - 1, TOTAL_FRAMES);

  const promises = [];
  for (let i = startFrame; i <= endFrame; i++) {
    const idx = i - 1;
    promises.push(
      loadImageWithRetry(getFramePath(i, tier))
        .then((img) => {
          frames[idx] = img;
        })
        .catch(() => {})
    );
  }

  await Promise.allSettled(promises);
}

export function updateCurrentFrame(frameIndex: number): void {
  const currentBatch = Math.floor(frameIndex / BATCH_SIZE);
  const lookAheadBatch = Math.floor((frameIndex + LOOK_AHEAD) / BATCH_SIZE);

  for (let b = currentBatch; b <= lookAheadBatch; b++) {
    if (b * BATCH_SIZE < TOTAL_FRAMES) {
      loadBatch(b);
    }
  }
}

export function initFrameLoader(): void {
  if (typeof window === "undefined") return;

  tier = getResolutionTier(window.innerWidth);

  const fallbackTimer = setTimeout(() => {
    isFallback.set(true);
  }, FALLBACK_TIMEOUT_MS);

  // Load first 2 batches in parallel
  Promise.all([loadBatch(0), loadBatch(1)]).then(() => {
    isInitialLoadComplete.set(true);
    clearTimeout(fallbackTimer);
  });
}
