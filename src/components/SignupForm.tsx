"use client";

import { useState, useRef, type FormEvent } from "react";
import type { ScrollCanvasHandle } from "./ScrollCanvas";

interface SignupFormProps {
  progress: number;
  canvasRef: React.RefObject<ScrollCanvasHandle | null>;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

type Phase = "form" | "flash" | "success";

export default function SignupForm({ progress, canvasRef }: SignupFormProps) {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOpacity, setSuccessOpacity] = useState(0);
  const successRef = useRef<HTMLDivElement>(null);

  // Form appears at the very end of the last section
  const formProgress = progress >= 0.97 ? Math.min((progress - 0.97) / 0.02, 1) : 0;

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email address";
    if (!phone.trim()) errs.phone = "Phone is required";
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    // Play flash sequence
    setPhase("flash");
    if (canvasRef.current) {
      await canvasRef.current.playFlashSequence();
    }

    // Submit form data in background
    const formData = { name, email, phone };
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("API error");
    } catch {
      try {
        const existing = JSON.parse(localStorage.getItem("signup-backup") || "[]");
        existing.push({ ...formData, timestamp: new Date().toISOString() });
        localStorage.setItem("signup-backup", JSON.stringify(existing));
      } catch {}
    }

    setIsSubmitting(false);
    setPhase("success");

    // Smooth fade-in for success message
    requestAnimationFrame(() => {
      setTimeout(() => setSuccessOpacity(1), 50);
      setTimeout(() => successRef.current?.focus(), 600);
    });
  }

  // Phase: form
  if (phase === "form") {
    if (formProgress <= 0) return null;

    return (
      <div
        className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
        style={{ opacity: formProgress }}
      >
        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto mx-4 w-full max-w-md space-y-5 rounded-lg bg-black/50 p-8 backdrop-blur-md"
          noValidate
        >
          <h2
            className="mb-2 text-center text-2xl uppercase tracking-[0.25em] text-white"
            style={{ fontFamily: "var(--font-display), serif", fontWeight: 400 }}
          >
            Book Your Hunt
          </h2>
          <p
            className="mb-4 text-center text-sm tracking-wide text-white/50"
            style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 300 }}
          >
            Fill in your details. We&apos;ll be in touch within 24 hours.
          </p>

          <div>
            <label htmlFor="signup-name" className="sr-only">Full Name</label>
            <input
              id="signup-name"
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-b border-white/30 bg-transparent px-2 py-3 text-white placeholder-white/40 outline-none focus:border-amber-500/70 tracking-wide"
              style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 300 }}
            />
            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="signup-email" className="sr-only">Email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-white/30 bg-transparent px-2 py-3 text-white placeholder-white/40 outline-none focus:border-amber-500/70 tracking-wide"
              style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 300 }}
            />
            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="signup-phone" className="sr-only">Phone</label>
            <input
              id="signup-phone"
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border-b border-white/30 bg-transparent px-2 py-3 text-white placeholder-white/40 outline-none focus:border-amber-500/70 tracking-wide"
              style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 300 }}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-label="Submit signup form"
            className="w-full rounded border border-amber-500/60 bg-amber-700/50 py-4 text-lg uppercase tracking-[0.3em] text-white transition-all hover:border-amber-400 hover:bg-amber-600/70 hover:shadow-[0_0_40px_rgba(217,119,6,0.25)] disabled:opacity-50"
            style={{ fontFamily: "var(--font-display), serif", fontWeight: 400 }}
          >
            {isSubmitting ? "Submitting..." : "Take the Shot"}
          </button>
        </form>
      </div>
    );
  }

  // Phase: flash — canvas is playing
  if (phase === "flash") {
    return null;
  }

  // Phase: success — smooth fade-in over the last frame
  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
      style={{
        opacity: successOpacity,
        transition: "opacity 1.5s ease-in-out",
      }}
    >
      {/* Subtle dark overlay so text is readable on any frame */}
      <div
        className="absolute inset-0 bg-black/60"
        style={{
          opacity: successOpacity,
          transition: "opacity 2s ease-in-out",
        }}
      />

      <div
        ref={successRef}
        tabIndex={-1}
        className="relative z-10 text-center text-white"
        role="status"
        aria-live="polite"
      >
        <h2
          className="mb-6 text-5xl uppercase tracking-[0.2em] md:text-6xl"
          style={{ fontFamily: "var(--font-display), serif", fontWeight: 400 }}
        >
          Your Hunt Starts Here
        </h2>
        <div className="mx-auto mb-8 h-px w-24 bg-amber-500/60" />
        <p
          className="text-xl tracking-wide text-white/70"
          style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 300 }}
        >
          We&apos;ll be in touch within 24 hours.
        </p>
        <p
          className="pointer-events-auto mt-10 text-sm tracking-wide text-white/30"
          style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 300 }}
        >
          Having trouble? Email us at{" "}
          <a href="mailto:info@outfitter.com" className="underline hover:text-white/50 transition-colors">
            info@outfitter.com
          </a>
        </p>
      </div>
    </div>
  );
}
