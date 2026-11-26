import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import LeaderboardClient, { type LeaderboardTeam } from "./leaderboard-client";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function LeaderboardContent() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");

  const supabase = createAdminClient();
  const [teamsResult, scansResult, collegesResult] = await Promise.all([
    supabase
      .from("teams")
      .select("id, team_code, leader_name, college_id, group_name, is_finalist, is_disqualified"),
    supabase.from("team_qr_scans").select("team_id, question_code, scanned_at"),
    supabase.from("colleges").select("id, name"),
  ]);
  const error = teamsResult.error ?? scansResult.error ?? collegesResult.error;

  if (error) {
    console.error("Could not load admin leaderboard:", error.message);
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">
            ← Back to Admin
          </Link>
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-900 bg-red-950/40 p-5 text-red-200"
          >
            Could not load the leaderboard and team scans. Please try again.
          </p>
        </div>
      </main>
    );
  }

  const scansByTeam = new Map<string, { questionCode: string; scannedAt: string }[]>();
  for (const scan of scansResult.data ?? []) {
    const scans = scansByTeam.get(scan.team_id) ?? [];
    scans.push({ questionCode: scan.question_code, scannedAt: scan.scanned_at });
    scansByTeam.set(scan.team_id, scans);
  }

  const collegeNameById = new Map(
    (collegesResult.data ?? []).map((college) => [college.id, college.name])
  );
  const rankedTeams = (teamsResult.data ?? [])
    .filter((team) => !team.is_disqualified)
    .map((team) => {
      const scans = scansByTeam.get(team.id) ?? [];
      const latestScan = scans.reduce<string | null>(
        (latest, scan) =>
          !latest || Date.parse(scan.scannedAt) > Date.parse(latest)
            ? scan.scannedAt
            : latest,
        null
      );

      return {
        id: team.id,
        teamCode: team.team_code,
        leaderName: team.leader_name,
        collegeName: collegeNameById.get(team.college_id) ?? "Unknown college",
        groupName: team.group_name,
        isFinalist: team.is_finalist,
        scans: scans.sort((a, b) => a.scannedAt.localeCompare(b.scannedAt)),
        latestScan,
      };
    })
    .sort((a, b) => {
      if (a.scans.length !== b.scans.length) return b.scans.length - a.scans.length;
      if (a.latestScan && b.latestScan) {
        return Date.parse(a.latestScan) - Date.parse(b.latestScan);
      }
      if (a.latestScan) return -1;
      if (b.latestScan) return 1;
      return a.teamCode.localeCompare(b.teamCode);
    })
    .map((team, index) => ({ ...team, rank: index + 1 }));

  const teams: LeaderboardTeam[] = rankedTeams.map((team) => ({
    id: team.id,
    teamCode: team.teamCode,
    leaderName: team.leaderName,
    collegeName: team.collegeName,
    groupName: team.groupName,
    isFinalist: team.isFinalist,
    scans: team.scans,
    rank: team.rank,
    lastScanTimestamp: team.latestScan,
  }));

  return <LeaderboardClient teams={teams} />;
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-8 text-zinc-400">
          Loading leaderboard...
        </main>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
