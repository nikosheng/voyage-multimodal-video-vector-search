const LIGHT_COLORS = ["#FF6B6B", "#F5B700", "#4ECDC4", "#D63384", "#20C997"];

/**
 * Decorative twinkling string-lights banner, used along the top of the
 * big-screen dashboard for a festive touch.
 */
export default function StringLights({ count = 24 }: { count?: number }) {
  const lights = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="string-lights flex justify-center gap-4 overflow-hidden px-4 py-2">
      {lights.map((i) => (
        <span
          key={i}
          className="inline-block h-3 w-3 rounded-full"
          style={{
            backgroundColor: LIGHT_COLORS[i % LIGHT_COLORS.length],
            boxShadow: `0 0 8px 2px ${LIGHT_COLORS[i % LIGHT_COLORS.length]}`,
          }}
        />
      ))}
    </div>
  );
}
