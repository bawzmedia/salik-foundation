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
  getFramePath,
  getFlashFramePath,
  getResolutionTier,
} from "@/lib/frames";

interface UseFrameLoaderReturn {
  frames: React.MutableRefObject<(HTMLImageElement | null)[]>;
  flashFrames: React.MutableRefObject<(HTMLImageElement | null)[]>;
  loadingProgress: number;
  isInitialLoadComplete: boolean;
  isFallback: boolean;
  updateCurrentFrame: (frameIndex: number) => void;
  waitForFrames: (startIdx: number, count: number) => Promise<void>;
}

function loadImageWithRetry(
  src: string,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.decode) {
        img.decode().then(() => resolve(img)).catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => {
      if (retries > 0) {
        setTimeout(() => {
          loadImageWithRetry(src, retries - 1, delay).then(resolve).catch(reject);
        }, delay);
      } else {
        reject(new Error(`Failed to load: ${src}`));
      }
    };
    img.src = src;
  });
}

export function useFrameLoader(): UseFrameLoaderReturn {
  const frames = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const flashFrames = useRef<(HTMLImageElement | null)[]>(new Array(FLASH_FRAME_COUNT).fill(null));
  const loadedBatches = useRef<Set<number>>(new Set());
  const [loadedCount, setLoadedCount] = useState(0);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const tier = useRef<"desktop" | "mobile">("desktop");

  const getBatchRange = useCallback((batchIndex: number): [number, number] => {
    if (batchIndex === 0) return [1, INITIAL_BATCH_SIZE];
    const start = INITIAL_BATCH_SIZE + (batchIndex - 1) * BATCH_SIZE + 1;
    return [start, Math.min(start + BATCH_SIZE - 1, TOTAL_FRAMES)];
  }, []);

  const loadBatch = useCallback(async (batchIndex: number) => {
    if (loadedBatches.current.has(batchIndex)) return;
    loadedBatches.current.add(batchIndex);

    const [startFrame, endFrame] = getBatchRange(batchIndex);

    const promises = [];
    for (let i = startFrame; i <= endFrame; i++) {
      const idx = i - 1;
      promises.push(
        loadImageWithRetry(getFramePath(i, tier.current))
          .then((img) => {
            frames.current[idx] = img;
            setLoadedCount((prev) => prev + 1);
          })
          .catch(() => {})
      );
    }

    await Promise.allSettled(promises);
  }, [getBatchRange]);

  const frameToBatch = useCallback((frameIndex: number): number => {
    if (frameIndex < INITIAL_BATCH_SIZE) return 0;
    return Math.floor((frameIndex - INITIAL_BATCH_SIZE) / BATCH_SIZE) + 1;
  }, []);

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
    [loadBatch, frameToBatch, getBatchRange]
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
      for (let i = 1; i <= FLASH_FRAME_COUNT; i++) {
        loadImageWithRetry(getFlashFramePath(i))
          .then((img) => {
            flashFrames.current[i - 1] = img;
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
  };
}
