"use client";

import { CloudSun, Droplets, Sparkles, ThermometerSun } from "lucide-react";
import type { WeatherInfo } from "@/types";

interface WeatherCardProps {
  weather: WeatherInfo | null;
  isLoading?: boolean;
}

function formatTemperature(tempF: number) {
  const fahrenheit = Math.round(tempF);
  const celsius = Math.round(((tempF - 32) * 5) / 9);
  return `${fahrenheit}°F / ${celsius}°C`;
}

export default function WeatherCard({ weather, isLoading = false }: Readonly<WeatherCardProps>) {
  return (
    <section className="surface-card rounded-[1.25rem] border border-black/8 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
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
            <div className="surface-subcard rounded-2xl border border-black/6 p-4">
              <ThermometerSun size={18} />
              <p className="metric-display mt-2 text-2xl">{formatTemperature(weather.temp)}</p>
              <p className="body-copy text-sm" style={{ color: "var(--on-surface-variant)" }}>{weather.condition}</p>
            </div>
            <div className="surface-subcard rounded-2xl border border-black/6 p-4">
              <Droplets size={18} />
              <p className="metric-display mt-2 text-2xl">{Math.round(weather.humidity)}%</p>
              <p className="body-copy text-sm" style={{ color: "var(--on-surface-variant)" }}>Humidity</p>
            </div>
          </div>
          <div
            className="mt-4 flex items-start gap-3 rounded-2xl border p-4"
            style={{
              background: "var(--secondary-container)",
              borderColor: "rgba(216, 200, 183, 0.35)",
              color: "#f7f4ee",
            }}
          >
            <Sparkles size={16} className="mt-0.5 shrink-0" style={{ color: "#f4d7a6" }} />
            <p
              className="body-copy text-sm leading-6"
              style={{ color: "#f7f4ee" }}
            >
              {weather.aiTip ?? `Local context from ${weather.location}.`}
            </p>
          </div>
        </>
      ) : (
        <p className="surface-subcard mt-5 rounded-2xl border border-black/6 p-4 text-sm" style={{ color: "var(--on-card-variant)" }}>
          Weather is unavailable. Skin guidance will use scan history only.
        </p>
      )}
    </section>
  );
}
