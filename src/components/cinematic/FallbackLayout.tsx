import { SECTIONS } from "@/lib/frames";

export default function FallbackLayout() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="flex h-[60vh] items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-black">
        <div className="text-center px-8">
          <img
            src="/salik-foundation-logo.png"
            alt="Salik Foundation"
            className="mx-auto mb-8 h-14"
          />
          <h1
            className="text-4xl font-light tracking-wide text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
          >
            You are not alone. You never were.
          </h1>
          <p className="mt-4 text-lg text-white/60">
            A journey through 1000+ years of Islam reaching every corner of the earth.
          </p>
        </div>
      </div>

      {/* Eras as cards */}
      <div className="mx-auto max-w-3xl space-y-16 px-6 py-16">
        {SECTIONS.map((section) => (
          <div key={section.id} className="border-l-2 pl-6" style={{ borderColor: section.colorAccent }}>
            <div className="text-xs tracking-[0.3em] uppercase" style={{ color: section.colorAccent }}>
              Era {section.id} — {section.era}
            </div>
            <h2
              className="mt-2 text-2xl font-light tracking-wide text-white/90 md:text-3xl"
              style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
            >
              {section.name}
            </h2>
            {section.textOverlay?.map((line, i) => (
              <p key={i} className="mt-2 text-base text-white/60">
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-black py-16 text-center">
        <p className="text-3xl font-light tracking-wide text-white" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
          Will you answer the call?
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/donate"
            className="rounded-sm border border-[#4AB3E2] bg-[#4AB3E2]/20 px-10 py-4 tracking-[0.2em] uppercase text-white"
          >
            Donate
          </a>
          <a
            href="/programs"
            className="rounded-sm border border-white/30 px-8 py-4 tracking-[0.2em] uppercase text-white/80"
          >
            Programs
          </a>
        </div>
        <p className="mt-6 text-sm text-white/40">Guided by the Qur'an. Serving Humanity.</p>
      </div>
    </div>
  );
}
