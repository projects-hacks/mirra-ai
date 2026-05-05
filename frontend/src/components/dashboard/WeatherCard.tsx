"use client";

import { CloudSun, Droplets, ThermometerSun } from "lucide-react";
import type { WeatherInfo } from "@/types";

interface WeatherCardProps {
  weather: WeatherInfo | null;
  isLoading?: boolean;
}

export default function WeatherCard({ weather, isLoading = false }: Readonly<WeatherCardProps>) {
  return (
    <section className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">Context</p>
          <h2 className="section-display mt-2 text-xl sm:text-2xl">Weather</h2>
        </div>
        <CloudSun size={24} style={{ color: "var(--accent)" }} />
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm" style={{ color: "var(--on-surface-variant)" }}>Loading weather context...</p>
      ) : weather ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-black/6 bg-[#f8fafc] p-4">
              <ThermometerSun size={18} />
              <p className="metric-display mt-2 text-2xl">{Math.round(weather.temp)}F</p>
              <p className="body-copy text-sm" style={{ color: "var(--on-surface-variant)" }}>{weather.condition}</p>
            </div>
            <div className="rounded-2xl border border-black/6 bg-[#f8fafc] p-4">
              <Droplets size={18} />
              <p className="metric-display mt-2 text-2xl">{Math.round(weather.humidity)}%</p>
              <p className="body-copy text-sm" style={{ color: "var(--on-surface-variant)" }}>Humidity</p>
            </div>
          </div>
          <p className="body-copy mt-4 rounded-2xl border border-[#d8c8b7] bg-[var(--secondary-container)] p-4 text-sm text-[var(--on-secondary-container)]">
            {weather.aiTip ?? `Local context from ${weather.location}.`}
          </p>
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-black/6 bg-[#f8fafc] p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
          Weather is unavailable. Skin guidance will use scan history only.
        </p>
      )}
    </section>
  );
}
