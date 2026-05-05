"use client";

import { useRouter } from "next/navigation";
import type { User } from "@/types";

interface AppHeaderProps {
  title: string;
  user: User | null;
}

export default function AppHeader({ title, user }: Readonly<AppHeaderProps>) {
  const router = useRouter();

  return (
    <header
      className="page-header-shell px-4"
      style={{ paddingTop: "calc(var(--safe-top) + 0.85rem)" }}
    >
      <div className="page-shell flex min-h-[72px] items-center justify-between gap-4 py-4">
        <div>
          <p className="eyebrow text-[0.7rem]" style={{ color: "var(--on-surface-variant)" }}>
            Mirra
          </p>
          <h1 className="section-display text-[1.35rem] sm:text-[1.5rem]">
            {title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="flex h-11 w-11 items-center justify-center rounded-full border"
          style={{
            backdropFilter: "blur(14px)",
            background: "rgba(15, 19, 39, 0.72)",
            borderColor: "rgba(154, 170, 226, 0.22)",
          }}
          aria-label="Open profile"
        >
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="ui-title text-sm">
              {user?.displayName?.[0]?.toUpperCase() ?? "M"}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
