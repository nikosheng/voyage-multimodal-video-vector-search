import { useMemo } from "react";

interface SnowfallProps {
  count?: number;
}

/**
 * Decorative falling-snow background effect. Pure CSS animation driven by
 * randomized per-flake timing/size, rendered behind the page content.
 */
export default function Snowfall({ count = 60 }: SnowfallProps) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 8 + Math.random() * 12,
        size: 0.4 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 120,
        opacity: 0.3 + Math.random() * 0.6,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute top-[-5%] select-none text-white"
          style={{
            left: `${f.left}%`,
            fontSize: `${f.size}rem`,
            opacity: f.opacity,
            animation: `snow-fall ${f.duration}s linear ${f.delay}s infinite`,
            // custom property consumed by the keyframes for horizontal drift
            ["--drift" as string]: `${f.drift}px`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}
