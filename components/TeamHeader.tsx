"use client";

import Link from "next/link";
import { useActionState } from "react";
import { teamLogout } from "@/app/login/actions";

export function TeamHeader() {
  const [logoutState, logoutAction] = useActionState(teamLogout, undefined);

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Treasure Hunt
        </Link>
        <div className="flex items-center gap-4">
          <TeamStatus />
          <form action={logoutAction} className="hidden" id="logout-form">
            <button type="submit" className="text-sm text-gray-600 hover:text-black">
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function TeamStatus() {
  // This will be populated by the server component via props
  // For now, we'll use a client-side approach with a data attribute
  // The actual team info will come from a server component wrapper
  return (
    <div id="team-status" className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm rounded bg-black px-4 py-2 text-white hover:opacity-90"
      >
        Login
      </Link>
    </div>
  );
}