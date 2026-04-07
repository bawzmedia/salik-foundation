import { useRef, useState, useCallback, useEffect } from "react";
import {
  TOTAL_FRAMES,
  INITIAL_BATCH_SIZE,
  BATCH_SIZE,
  LOOK_AHEAD,
  MAX_RETRIES,
  RETRY_DELAY_MS,
  FALLBACK_TIMEOUT_MS,
  FLASH_FRAME_COUNT,
  SECTIONS,
  getFramePath,
  getFlashFramePath,
  getResolutionTier,
  frameToBatch,
  getSectionBatchIndices,
} from "@/lib/frames";

interface UseFrameLoaderReturn {
  frames: React.MutableRefObject<(ImageBitmap | null)[]>;
  flashFrames: React.MutableRefObject<(ImageBitmap | null)[]>;
  loadingProgress: number;
  isInitialLoadComplete: boolean;
  isFallback: boolean;
  updateCurrentFrame: (frameIndex: number) => void;
  waitForFrames: (startIdx: number, count: number) => Promise<void>;
  evictSection: (sectionIndex: number) => void;
}

/**
 * Load a URL as a GPU-resident ImageBitmap.
 * Using fetch → blob → createImageBitmap means the image is fully decoded and
 * rasterized at load time, so ctx.drawImage() is a zero-cost GPU texture blit.
 */
async function loadBitmapWithRetry(
  src: string,
  signal: AbortSignal,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<ImageBitmap> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const res = await fetch(src, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${src}`);
      const blob = await res.blob();
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return await createImageBitmap(blob);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (isAbort) throw err; // don't retry aborts
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
    }
  }
  // TypeScript: unreachable, but satisfies return type
  throw new Error(`Failed to load after retries: ${src}`);
}

export function useFrameLoader(): UseFrameLoaderReturn {
  const frames = useRef<(ImageBitmap | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const flashFrames = useRef<(ImageBitmap | null)[]>(new Array(FLASH_FRAME_COUNT).fill(null));
  const loadedBatches = useRef<Set<number>>(new Set());
  // AbortController per batch — allows cancelling in-flight fetches on eviction
  const batchControllers = useRef<Map<number, AbortController>>(new Map());
  const [loadedCount, setLoadedCount] = useState(0);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const tier = useRef<"desktop" | "mobile">("desktop");

  const getBatchRange = useCallback((batchIndex: number): [number, number] => {
    if (batchIndex === 0) return [1, INITIAL_BATCH_SIZE];
    const start = INITIAL_BATCH_SIZE + (batchIndex - 1) * BATCH_SIZE + 1;
    return [start, Math.min(start + BATCH_SIZE - 1, TOTAL_FRAMES)];
  }, []);

  const loadBatch = useCallback(
    async (batchIndex: number) => {
      if (loadedBatches.current.has(batchIndex)) return;
      loadedBatches.current.add(batchIndex);

      const controller = new AbortController();
      batchControllers.current.set(batchIndex, controller);

      const [startFrame, endFrame] = getBatchRange(batchIndex);

      const promises: Promise<void>[] = [];
      for (let i = startFrame; i <= endFrame; i++) {
        const idx = i - 1;
        promises.push(
          loadBitmapWithRetry(getFramePath(i, tier.current), controller.signal)
            .then((bitmap) => {
              frames.current[idx] = bitmap;
              setLoadedCount((prev) => prev + 1);
            })
            .catch((err) => {
              const isAbort = err instanceof DOMException && err.name === "AbortError";
              if (!isAbort) {
                // Silently degrade — drawFrameAtIndex will fall back to nearest loaded frame
              }
            })
        );
      }

      await Promise.allSettled(promises);
      batchControllers.current.delete(batchIndex);
    },
    [getBatchRange]
  );

  const updateCurrentFrame = useCallback(
    (frameIndex: number) => {
      const currentBatch = frameToBatch(frameIndex);
      const lookAheadBatch = frameToBatch(Math.min(frameIndex + LOOK_AHEAD, TOTAL_FRAMES - 1));

      for (let b = currentBatch; b <= lookAheadBatch; b++) {
        const [start] = getBatchRange(b);
        if (start <= TOTAL_FRAMES) {
          loadBatch(b);
        }
      }
    },
    [loadBatch, getBatchRange]
  );

  const waitForFrames = useCallback(
    (startIdx: number, count: number): Promise<void> => {
      return new Promise((resolve) => {
        const end = Math.min(startIdx + count, TOTAL_FRAMES);
        const deadline = performance.now() + 2000; // 2s max wait, then play anyway
        const check = () => {
          if (performance.now() > deadline) { resolve(); return; }
          for (let i = startIdx; i < end; i++) {
            if (!frames.current[i]) {
              requestAnimationFrame(check);
              return;
            }
          }
          resolve();
        };
        check();
      });
    },
    [frames]
  );

  /**
   * Free GPU memory for a section that is no longer needed.
   * Cancels in-flight fetches and closes ImageBitmaps.
   * IMPORTANT: sets frames.current[i] = null BEFORE calling .close() so that
   * the drawFrameAtIndex fallback walk never finds a closed bitmap.
   * Removes batch indices from loadedBatches so they can be re-fetched
   * (cheaply, from browser disk cache) if the user scrolls back.
   */
  const evictSection = useCallback((sectionIndex: number) => {
    const s = SECTIONS[sectionIndex];
    if (!s) return;

    const batchIndices = getSectionBatchIndices(sectionIndex);

    // Cancel any in-flight fetch requests for this section
    batchIndices.forEach((b) => {
      const ctrl = batchControllers.current.get(b);
      if (ctrl) {
        ctrl.abort();
        batchControllers.current.delete(b);
      }
      loadedBatches.current.delete(b); // allow re-loading on scrollback
    });

    // Close ImageBitmaps — null FIRST to prevent drawFrameAtIndex finding a closed bitmap
    for (let i = s.startFrame - 1; i < s.endFrame; i++) {
      const bitmap = frames.current[i];
      if (bitmap) {
        frames.current[i] = null; // null before close — critical ordering
        bitmap.close();
      }
    }
  }, []);

  useEffect(() => {
    tier.current = getResolutionTier(window.innerWidth);

    const fallbackTimer = setTimeout(() => {
      setIsFallback(true);
    }, FALLBACK_TIMEOUT_MS);

    loadBatch(0).then(() => {
      setIsInitialLoadComplete(true);
      clearTimeout(fallbackTimer);
    });

    // Load flash frames if any
    if (FLASH_FRAME_COUNT > 0) {
      const noop = new AbortController();
      for (let i = 1; i <= FLASH_FRAME_COUNT; i++) {
        loadBitmapWithRetry(getFlashFramePath(i), noop.signal)
          .then((bitmap) => {
            flashFrames.current[i - 1] = bitmap;
          })
          .catch(() => {});
      }
    }

    return () => clearTimeout(fallbackTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    frames,
    flashFrames,
    loadingProgress: loadedCount / TOTAL_FRAMES,
    isInitialLoadComplete,
    isFallback,
    updateCurrentFrame,
    waitForFrames,
    evictSection,
  };
}
