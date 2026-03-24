import { SECTIONS } from "@/lib/frames";

export default function FallbackLayout() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative h-[60vh] w-full">
        <img
          src="/frames/desktop/frame-0060.webp"
          alt="Muslim trader sharing the Qur'an with Norse merchants"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
      </div>

      <div className="mx-auto max-w-2xl space-y-12 px-6 py-16">
        {SECTIONS.filter((s) => s.textOverlay).map((section) => (
          <div key={section.id} className="text-center">
            {section.textOverlay!.split("\n").map((line, i) => (
              <p
                key={i}
                className={`${
                  i === 0
                    ? "text-2xl md:text-3xl"
                    : "mt-3 text-lg text-white/70"
                } font-light tracking-wide text-white/80`}
                style={{ fontFamily: "Georgia, serif" }}
              >
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-md px-6 pb-16 text-center">
        <a
          href="/donate"
          className="inline-block rounded-sm border border-[#4AB3E2] bg-[#4AB3E2]/20 px-10 py-4 text-lg tracking-[0.2em] uppercase text-white"
        >
          Answer the Call
        </a>
      </div>
    </div>
  );
}
