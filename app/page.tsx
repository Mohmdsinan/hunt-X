import { Suspense } from "react";
import Link from "next/link";
import { TeamHeaderWrapper } from "@/components/TeamHeaderWrapper";

export default function Home() {
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
      <main className="flex-1 mx-auto max-w-3xl p-6 space-y-8">
        <section className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Treasure Hunt Leaderboard</h1>
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
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("team_code, leader_name, college_id, group_name, score")
    .order("score", { ascending: false })
    .limit(20);

  if (!teams || teams.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-gray-500">
        No teams registered yet
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Rank</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Team</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Leader</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">College</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Group</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {teams.map((team, index) => (
            <tr key={team.team_code} className={index === 0 ? "bg-yellow-50" : "hover:bg-gray-50"}>
              <td className="px-4 py-3 font-medium">
                {index + 1}
                {index === 0 && <span className="ml-1">🥇</span>}
                {index === 1 && <span className="ml-1">🥈</span>}
                {index === 2 && <span className="ml-1">🥉</span>}
              </td>
              <td className="px-4 py-3 font-mono">{team.team_code}</td>
              <td className="px-4 py-3">{team.leader_name}</td>
              <td className="px-4 py-3">{team.college_id}</td>
              <td className="px-4 py-3">{team.group_name || "-"}</td>
              <td className="px-4 py-3 font-bold">{team.score || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}