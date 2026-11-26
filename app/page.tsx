import { Suspense } from "react";
import Link from "next/link";
import { TeamHeaderWrapper } from "@/components/TeamHeaderWrapper";
import { createAdminClient } from "@/lib/supabase/admin";

export default function Home() {
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
      <main className="flex-1 mx-auto max-w-3xl p-6 space-y-8">
        <section className="text-center space-y-4">
          <h1 className="text-3xl font-bold">HuntX Leaderboard</h1>
          <p className="text-gray-600">
            Scan QR codes to solve questions and earn points for your team
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Top Teams</h2>
          <Suspense
            fallback={
              <div className="rounded-lg border p-8 text-center text-gray-500">
                Loading leaderboard...
              </div>
            }
          >
            <Leaderboard />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

async function Leaderboard() {
  const supabase = createAdminClient();
  const [
    { data: teams, error: teamsError },
    { data: scans, error: scansError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, team_code, group_name, is_disqualified")
      .eq("is_disqualified", false),
    supabase.from("team_qr_scans").select("team_id, scanned_at"),
  ]);

  if (teamsError || scansError) {
    console.error("Leaderboard data query failed:", {
      teams: teamsError?.message,
      scans: scansError?.message,
    });
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
        Leaderboard is temporarily unavailable.
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
        No teams registered yet
      </div>
    );
  }

  const scansByTeam = new Map<string, { count: number; lastScannedAt: string }>();
  for (const scan of scans ?? []) {
    const summary = scansByTeam.get(scan.team_id);
    if (summary) {
      summary.count += 1;
      if (scan.scanned_at > summary.lastScannedAt) {
        summary.lastScannedAt = scan.scanned_at;
      }
    } else {
      scansByTeam.set(scan.team_id, { count: 1, lastScannedAt: scan.scanned_at });
    }
  }

  const leaderboard = teams
    .map((team) => ({
      ...team,
      qrCount: scansByTeam.get(team.id)?.count ?? 0,
      lastScannedAt: scansByTeam.get(team.id)?.lastScannedAt ?? null,
    }))
    .sort((a, b) => {
      if (a.qrCount !== b.qrCount) return b.qrCount - a.qrCount;
      if (a.lastScannedAt && b.lastScannedAt) {
        return a.lastScannedAt.localeCompare(b.lastScannedAt);
      }
      if (a.lastScannedAt) return -1;
      if (b.lastScannedAt) return 1;
      return a.team_code.localeCompare(b.team_code);
    });

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100">
      <ul className="divide-y divide-zinc-800">
        {leaderboard.map((team) => (
          <li
            key={team.team_code}
            className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6"
          >
            <div className="min-w-0">
              <p className="font-mono font-semibold text-white">{team.team_code}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {team.group_name ? `Group ${team.group_name}` : "Group not assigned"}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-100">
              {team.qrCount} {team.qrCount === 1 ? "QR" : "QRs"} Scanned
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}