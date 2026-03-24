interface ScrollProgressProps {
  progress: number;
}

export default function ScrollProgress({ progress }: ScrollProgressProps) {
  let opacity = 0;
  if (progress > 0.05 && progress < 0.9) {
    opacity = progress < 0.1 ? (progress - 0.05) / 0.05 : progress > 0.85 ? (0.9 - progress) / 0.05 : 1;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 h-[2px]"
      style={{ opacity }}
    >
      <div
        className="h-full bg-white/40 transition-[width] duration-100"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
