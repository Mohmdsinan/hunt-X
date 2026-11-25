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
            className="sticky top-0 z-10 border-b bg-white"
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <Link href="/" className="text-xl font-bold">
                Treasure Hunt
              </Link>
              <div className="h-9 w-16 animate-pulse rounded bg-gray-100" />
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
