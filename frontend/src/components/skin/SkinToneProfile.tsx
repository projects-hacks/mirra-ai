"use client";

import { Palette } from "lucide-react";
import type { SkinToneData } from "@/types";

interface SkinToneProfileProps {
  skinTone: SkinToneData | null;
}

const SWATCHES: Array<{ key: keyof SkinToneData; label: string }> = [
  { key: "skin_color", label: "Skin" },
  { key: "eye_color", label: "Eyes" },
  { key: "lip_color", label: "Lips" },
  { key: "hair_color", label: "Hair" },
  { key: "eyebrow_color", label: "Brows" },
];

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export default function SkinToneProfile({ skinTone }: Readonly<SkinToneProfileProps>) {
  const swatches = SWATCHES.filter((item) => isHex(skinTone?.[item.key]));
  const undertone = typeof skinTone?.undertone === "string" ? skinTone.undertone : null;

  return (
    <section className="surface-card rounded-[1.25rem] border border-black/8 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">Tone Profile</p>
          <h2 className="section-display mt-2 text-xl sm:text-2xl">Color signal</h2>
        </div>
        <Palette size={22} style={{ color: "var(--accent)" }} aria-hidden="true" />
      </div>

      {swatches.length || undertone ? (
        <>
          {undertone && (
            <div className="surface-subcard mt-5 inline-flex rounded-full border border-black/8 px-3 py-1.5 text-sm font-medium capitalize">
              {undertone} undertone
            </div>
          )}
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {swatches.map((item) => {
              const color = skinTone?.[item.key] as string;
              return (
                <div key={item.key} className="surface-subcard rounded-2xl border border-black/6 p-3 text-center">
                  <span
                    className="mx-auto block h-10 w-10 rounded-full border border-black/10 shadow-inner"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-xs font-medium">{item.label}</p>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="surface-subcard mt-5 rounded-2xl border border-black/6 p-4 text-sm" style={{ color: "var(--on-card-variant)" }}>
          Skin tone data will appear after a capture with color analysis.
        </p>
      )}
    </section>
  );
}
