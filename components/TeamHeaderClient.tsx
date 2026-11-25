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
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Treasure Hunt
        </Link>
        <div className="flex items-center gap-4">
          {initialSession ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {initialSession.teamCode} - {initialSession.leaderName}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-black"
                  disabled={pending}
                >
                  Logout
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm rounded bg-black px-4 py-2 text-white hover:opacity-90"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}