import { Suspense } from "react";
import Link from "next/link";
import { TeamHeaderWrapper } from "@/components/TeamHeaderWrapper";
import { TeamDashboardClient } from "./dashboard-client";

export default function TeamDashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense
        fallback={
          <header
            aria-busy="true"
            className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 text-white backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <Link href="/" className="text-lg font-bold tracking-tight text-white">
                HuntX
              </Link>
              <div className="h-8 w-28 animate-pulse rounded-full bg-zinc-800" />
            </div>
          </header>
        }
      >
        <TeamHeaderWrapper />
      </Suspense>
      <TeamDashboardClient />
    </div>
  );
}
