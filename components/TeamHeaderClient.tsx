"use client";

import Link from "next/link";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { teamLogout } from "@/app/login/actions";
import type { TeamSession } from "@/lib/team-auth";

interface TeamHeaderClientProps {
  initialSession: TeamSession | null;
}

export function TeamHeaderClient({ initialSession }: TeamHeaderClientProps) {
  const [, logoutAction, pending] = useActionState(teamLogout, undefined);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 px-3 py-2.5 text-white backdrop-blur-md sm:px-6 sm:py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-white">
          HuntX
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {initialSession ? (
            <>
              <Link
                href="/team"
                className="whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 sm:px-3 sm:text-sm"
              >
                {initialSession.teamCode}
                <span className="mx-1.5 text-zinc-500">•</span>
                {initialSession.groupName
                  ? `Group ${initialSession.groupName}`
                  : "No group"}
              </Link>
              <Link
                href={pathname === "/team" ? "/" : "/team"}
                className="whitespace-nowrap rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 sm:px-3.5 sm:text-sm"
              >
                {pathname === "/team" ? "Leaderboard" : "Scan QR"}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-lg border border-zinc-800 px-2 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-900 hover:text-white sm:px-3 sm:text-sm"
                  disabled={pending}
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}