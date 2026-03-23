"use client";

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
}

function loadImageWithRetry(
  src: string,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
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

  const loadBatch = useCallback(async (batchIndex: number) => {
    if (loadedBatches.current.has(batchIndex)) return;
    loadedBatches.current.add(batchIndex);

    const startFrame = batchIndex * BATCH_SIZE + 1;
    const endFrame = Math.min(startFrame + BATCH_SIZE - 1, TOTAL_FRAMES);

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
  }, []);

  const updateCurrentFrame = useCallback(
    (frameIndex: number) => {
      const currentBatch = Math.floor(frameIndex / BATCH_SIZE);
      const lookAheadBatch = Math.floor((frameIndex + LOOK_AHEAD) / BATCH_SIZE);

      for (let b = currentBatch; b <= lookAheadBatch; b++) {
        if (b * BATCH_SIZE < TOTAL_FRAMES) {
          loadBatch(b);
        }
      }
    },
    [loadBatch]
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

    for (let i = 1; i <= FLASH_FRAME_COUNT; i++) {
      loadImageWithRetry(getFlashFramePath(i))
        .then((img) => {
          flashFrames.current[i - 1] = img;
        })
        .catch(() => {});
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
  };
}
