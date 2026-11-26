"use client";

import Link from "next/link";
import { useActionState } from "react";
import { teamLogout } from "@/app/login/actions";
import type { TeamSession } from "@/lib/team-auth";

interface TeamHeaderClientProps {
  initialSession: TeamSession | null;
}

export function TeamHeaderClient({ initialSession }: TeamHeaderClientProps) {
  const [, logoutAction, pending] = useActionState(teamLogout, undefined);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-white">
          HuntX
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {initialSession ? (
            <>
              <span className="whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 sm:px-3 sm:text-sm">
                {initialSession.teamCode}
                <span className="mx-1.5 text-zinc-500">•</span>
                {initialSession.groupName
                  ? `Group ${initialSession.groupName}`
                  : "No group"}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
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