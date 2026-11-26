import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { TeamHeaderWrapper } from "@/components/TeamHeaderWrapper";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamSession } from "@/lib/team-auth";
import { teamLogout } from "@/app/login/actions";
import { TeamDashboardClient } from "./dashboard-client";

async function TeamDashboardContent() {
  await connection();
  const session = await getTeamSession();

  if (session) {
    const { data: team, error } = await createAdminClient()
      .from("teams")
      .select("is_disqualified, disqualification_reason")
      .eq("id", session.teamId)
      .maybeSingle();

    if (error) {
      console.error("Could not verify team access:", {
        teamId: session.teamId,
        code: error.code,
        message: error.message,
      });
      return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
          <section className="w-full max-w-md rounded-2xl border border-red-900 bg-red-950/40 p-6 text-center">
            <h1 className="text-xl font-bold text-red-200">Could not verify team access</h1>
            <p className="mt-2 text-sm text-red-200/80">
              The scanner is locked. Please log out and try again.
            </p>
            <form action={teamLogout} className="mt-5">
              <button className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-white hover:bg-zinc-800">
                Logout
              </button>
            </form>
          </section>
        </main>
      );
    }

    if (team?.is_disqualified) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
          <section className="w-full max-w-md rounded-2xl border border-red-500/50 bg-red-950/50 p-7 text-center shadow-xl shadow-red-950/20">
            <h1 className="text-2xl font-bold text-red-200">You are disqualified</h1>
            {team.disqualification_reason && (
              <p className="mt-3 text-sm text-red-200/80">
                Reason: {team.disqualification_reason}
              </p>
            )}
            <form action={teamLogout} className="mt-6">
              <button className="rounded-lg border border-red-300/30 px-5 py-2.5 font-medium text-red-100 transition hover:bg-red-900/50">
                Logout
              </button>
            </form>
          </section>
        </main>
      );
    }

  }

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

export default function TeamDashboard() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-8 text-zinc-400">
          Checking team access...
        </main>
      }
    >
      <TeamDashboardContent />
    </Suspense>
  );
}
