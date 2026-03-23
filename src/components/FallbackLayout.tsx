"use client";

import { SECTIONS } from "@/lib/frames";
import SignupForm from "./SignupForm";

export default function FallbackLayout() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative h-[60vh] w-full">
        <img
          src="/frames/desktop/frame-075.webp"
          alt="Mountain wilderness at dawn"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
      </div>

      <div className="mx-auto max-w-2xl space-y-12 px-6 py-16">
        {SECTIONS.filter((s) => s.textOverlay).map((section) => (
          <h2
            key={section.id}
            className="text-center text-3xl font-light tracking-wide text-white/80 md:text-4xl"
            style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
          >
            {section.textOverlay}
          </h2>
        ))}
      </div>

      <div className="mx-auto max-w-md px-6 pb-16">
        <SignupForm progress={1} canvasRef={{ current: null }} />
      </div>
    </div>
  );
}
