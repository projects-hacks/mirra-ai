"use client";

interface IntensitySlidersProps {
  intensities: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}

function labelFor(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function IntensitySliders({ intensities, onChange }: Readonly<IntensitySlidersProps>) {
  return (
    <section className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
      <p className="label-caps">Simulation</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Intensity controls</h2>
      <div className="mt-5 space-y-4">
        {Object.entries(intensities).map(([key, value]) => (
          <label key={key} className="block">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{labelFor(key)}</span>
              <span style={{ color: "var(--on-surface-variant)" }}>{value.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={value}
              onChange={(event) => onChange({ ...intensities, [key]: Number(event.target.value) })}
              className="w-full accent-[#111827]"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
