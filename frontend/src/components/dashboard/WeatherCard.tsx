"use client";

import { CloudSun, Droplets, ThermometerSun } from "lucide-react";
import type { WeatherInfo } from "@/types";

interface WeatherCardProps {
  weather: WeatherInfo | null;
  isLoading?: boolean;
}

export default function WeatherCard({ weather, isLoading = false }: Readonly<WeatherCardProps>) {
  return (
    <section className="glass-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">Context</p>
          <h2 className="mt-2 text-2xl">Weather</h2>
        </div>
        <CloudSun size={24} style={{ color: "var(--accent)" }} />
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm" style={{ color: "var(--on-surface-variant)" }}>Loading weather context...</p>
      ) : weather ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/55 p-4">
              <ThermometerSun size={18} />
              <p className="mt-2 text-2xl font-semibold">{Math.round(weather.temp)}F</p>
              <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>{weather.condition}</p>
            </div>
            <div className="rounded-2xl bg-white/55 p-4">
              <Droplets size={18} />
              <p className="mt-2 text-2xl font-semibold">{Math.round(weather.humidity)}%</p>
              <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>Humidity</p>
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-[var(--secondary-container)] p-4 text-sm leading-6 text-[var(--on-secondary-container)]">
            {weather.aiTip ?? `Local context from ${weather.location}.`}
          </p>
        </>
      ) : (
        <p className="mt-5 rounded-2xl bg-white/50 p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
          Weather is unavailable. Skin guidance will use scan history only.
        </p>
      )}
    </section>
  );
}
