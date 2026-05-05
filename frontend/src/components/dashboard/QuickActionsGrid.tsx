"use client";

import { Camera, ScanFace, Shirt, Sparkles } from "lucide-react";
import Link from "next/link";

const ACTIONS = [
  {
    title: "Capture Scan",
    description: "Refresh selfie context",
    href: "/capture",
    icon: Camera,
    color: "#111827",
  },
  {
    title: "Skin",
    description: "Scores and simulation",
    href: "/skin",
    icon: Sparkles,
    color: "#10b981",
  },
  {
    title: "GlowUp",
    description: "Face and tone guidance",
    href: "/glowup",
    icon: ScanFace,
    color: "#f59e0b",
  },
  {
    title: "Outfit",
    description: "Build a proof-ready look",
    href: "/outfit",
    icon: Shirt,
    color: "#8b5cf6",
  },
];

export default function QuickActionsGrid() {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-[1.25rem] border border-black/8 bg-white/78 p-4 shadow-[0_12px_28px_rgba(17,24,39,0.06)] backdrop-blur transition-transform hover:-translate-y-0.5"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(17,24,39,0.12)] transition-transform group-hover:scale-105"
              style={{ background: action.color }}
            >
              <Icon size={18} />
            </span>
            <h3 className="mt-4 text-base font-semibold tracking-tight">{action.title}</h3>
            <p className="mt-1 text-sm leading-5" style={{ color: "var(--on-surface-variant)" }}>
              {action.description}
            </p>
          </Link>
        );
      })}
    </section>
  );
}
