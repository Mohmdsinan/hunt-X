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
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          Treasure Hunt
        </Link>
        <div className="flex items-center gap-4">
          {initialSession ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {initialSession.teamCode} - {initialSession.leaderName}
                </span>
                <span className="text-xs text-zinc-400">
                  {initialSession.groupName
                    ? `Group ${initialSession.groupName}`
                    : "Group not assigned"}
                </span>
              </div>
              <Link
                href="/team"
                className="text-sm rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
              >
                Scan QR
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-sm text-zinc-300 hover:text-white"
                  disabled={pending}
                >
                  Logout
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}