"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ScrollCanvasHandle } from "@/components/ScrollCanvas";
import FallbackLayout from "@/components/FallbackLayout";

const ScrollCanvas = dynamic(() => import("@/components/ScrollCanvas"), {
  ssr: false,
});
const SectionOverlay = dynamic(() => import("@/components/SectionOverlay"), {
  ssr: false,
});
const ScrollProgress = dynamic(() => import("@/components/ScrollProgress"), {
  ssr: false,
});
const SignupForm = dynamic(() => import("@/components/SignupForm"), {
  ssr: false,
});

export default function Home() {
  const canvasRef = useRef<ScrollCanvasHandle>(null);
  const [progress, setProgress] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
  }, []);

  if (prefersReducedMotion || useFallback) {
    return <FallbackLayout />;
  }

  return (
    <main>
      <ScrollCanvas
        ref={canvasRef}
        onProgressChange={setProgress}
        onFallback={() => setUseFallback(true)}
      />
      <SectionOverlay progress={progress} />
      <ScrollProgress progress={progress} />
      <SignupForm progress={progress} canvasRef={canvasRef} />
    </main>
  );
}
