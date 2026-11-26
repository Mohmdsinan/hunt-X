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

        <Suspense
          fallback={
            <section className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-5 text-center text-amber-200">
              Loading Final Stage results...
            </section>
          }
        >
          <FinalStageWinners />
        </Suspense>

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

async function FinalStageWinners() {
  const supabase = createAdminClient();
  const [teamsResult, scansResult] = await Promise.all([
    supabase.from("teams").select("id, team_code, group_name, is_finalist"),
    supabase
      .from("team_qr_scans")
      .select("team_id, scanned_at")
      .eq("question_code", "TX-00")
      .order("scanned_at", { ascending: true }),
  ]);

  if (teamsResult.error || scansResult.error) {
    console.error("Final Stage leaderboard query failed:", {
      teams: teamsResult.error?.message,
      scans: scansResult.error?.message,
    });
    return (
      <section
        role="alert"
        className="rounded-xl border border-red-900 bg-red-950/40 p-5 text-center text-red-200"
      >
        Final Stage results are temporarily unavailable.
      </section>
    );
  }

  const teamsById = new Map((teamsResult.data ?? []).map((team) => [team.id, team]));
  const scannedTeamIds = new Set((scansResult.data ?? []).map((scan) => scan.team_id));
  const finishers = (scansResult.data ?? [])
    .map((scan) => {
      const team = teamsById.get(scan.team_id);
      return team
        ? {
            teamCode: team.team_code,
            groupName: team.group_name,
            scannedAt: scan.scanned_at,
          }
        : null;
    })
    .filter((finisher): finisher is NonNullable<typeof finisher> => finisher !== null);
  const selectedFinalists = (teamsResult.data ?? []).filter((team) => team.is_finalist);
  const finalistCount = selectedFinalists.length;
  const pendingFinalistCount = selectedFinalists.filter(
    (team) => !scannedTeamIds.has(team.id)
  ).length;

  if (finishers.length === 0 && finalistCount === 0) return null;

  return (
    <section
      aria-labelledby="final-stage-winners"
      className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/70 via-zinc-950 to-zinc-950 p-5 shadow-lg shadow-amber-950/20 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            HuntX Final Stage
          </p>
          <h2 id="final-stage-winners" className="mt-1 text-xl font-bold text-amber-100">
            Final Stage (TX-00) Winners
          </h2>
        </div>
        {pendingFinalistCount > 0 && (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-sm font-medium text-amber-200">
            Final Stage In Progress · {pendingFinalistCount} finalist
            {pendingFinalistCount === 1 ? "" : "s"} remaining
          </span>
        )}
      </div>

      {finishers.length > 0 && (
        <ol className="mt-5 space-y-2">
          {finishers.map((finisher, index) => {
            const place = index + 1;
            const placeStyle =
              place === 1
                ? "border-yellow-300/50 bg-yellow-300/10 text-yellow-200"
                : place === 2
                  ? "border-slate-300/40 bg-slate-300/10 text-slate-200"
                  : place === 3
                    ? "border-orange-400/40 bg-orange-400/10 text-orange-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300";
            const lastTwoDigits = place % 100;
            const suffix =
              lastTwoDigits >= 11 && lastTwoDigits <= 13
                ? "th"
                : place % 10 === 1
                  ? "st"
                  : place % 10 === 2
                    ? "nd"
                    : place % 10 === 3
                      ? "rd"
                      : "th";
            const placeLabel = `${place}${suffix} Place`;
            const scannedAtDate = new Date(finisher.scannedAt);
            const completionTime = Number.isNaN(scannedAtDate.getTime())
              ? finisher.scannedAt
              : scannedAtDate.toISOString();

            return (
              <li
                key={`${finisher.teamCode}-${finisher.scannedAt}`}
                className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center"
              >
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${placeStyle}`}>
                  {placeLabel}
                </span>
                <div>
                  <p className="font-mono text-lg font-bold text-white">{finisher.teamCode}</p>
                  <p className="text-sm text-zinc-400">
                    {finisher.groupName ? `Group ${finisher.groupName}` : "Group not assigned"}
                  </p>
                </div>
                <time
                  dateTime={finisher.scannedAt}
                  className="text-xs text-zinc-300 sm:text-right"
                >
                  {completionTime} UTC
                </time>
              </li>
            );
          })}
        </ol>
      )}
      {finishers.length > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          Finish order is chronological. Completion times are UTC with millisecond precision.
        </p>
      )}
    </section>
  );
}

async function Leaderboard() {
  const supabase = createAdminClient();
  const [
    { data: teams, error: teamsError },
    { data: scans, error: scansError },
  ] = await Promise.all([
    supabase.from("teams").select("id, team_code, group_name"),
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