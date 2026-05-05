"use client";

import { ImageIcon } from "lucide-react";
import type { VTOResult } from "@/types";

interface RecentLooksRowProps {
  looks: VTOResult[];
}

export default function RecentLooksRow({ looks }: Readonly<RecentLooksRowProps>) {
  return (
    <section className="glass-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps">Try-On</p>
          <h2 className="mt-2 text-2xl">Recent looks</h2>
        </div>
        <ImageIcon size={22} style={{ color: "var(--on-surface-variant)" }} />
      </div>

      {looks.length ? (
        <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
          {looks.map((look) => (
            <div key={`${look.imageUrl}-${look.timestamp}`} className="w-32 shrink-0 overflow-hidden rounded-2xl bg-white/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={look.imageUrl} alt={look.toolName} className="aspect-[3/4] w-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-white/50 p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
          Try-on results will appear here after your first generated look.
        </p>
      )}
    </section>
  );
}
