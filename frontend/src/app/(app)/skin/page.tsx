"use client";

import Link from "next/link";
import { useDashboard } from "@/hooks/useDashboard";
import SkinSummaryCard from "@/components/dashboard/SkinSummaryCard";

export default function SkinPage() {
  const { skinSummary, isLoading, error } = useDashboard();

  return (
    <div className="page-shell space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <SkinSummaryCard summary={skinSummary} isLoading={isLoading} />
      <section className="glass-card">
        <p className="label-caps">Skin Tools</p>
        <h2 className="mt-2 text-2xl">Health history</h2>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
          Review saved scans while the new tap-driven skin analysis flow is wired into the REST endpoints.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/capture" className="btn-primary">
            Capture Scan
          </Link>
          <Link href="/skin-history" className="btn-secondary">
            Open History
          </Link>
        </div>
      </section>
    </div>
  );
}
