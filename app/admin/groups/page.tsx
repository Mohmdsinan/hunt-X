import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import DownloadButton, { type GroupCsvRow } from "./download-button";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function GroupsContent() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");

  const db = createAdminClient();
  const [teamsResult, collegesResult] = await Promise.all([
    db
      .from("teams")
      .select("team_code, leader_name, group_name, college_id")
      .order("team_code"),
    db.from("colleges").select("id, name"),
  ]);
  const error = teamsResult.error ?? collegesResult.error;

  if (error) {
    console.error("Could not load group directory:", error.message);
    return (
      <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-300">
        Could not load group directory. Please try again.
      </p>
    );
  }

  const collegeNames = new Map(
    (collegesResult.data ?? []).map((college) => [college.id, college.name])
  );
  const groupedTeams = new Map<string, GroupCsvRow[]>();

  for (const team of teamsResult.data ?? []) {
    const group = team.group_name?.trim() ?? "";
    const rows = groupedTeams.get(group) ?? [];
    rows.push({
      group: group ? `Group ${group}` : "No group assigned",
      teamCode: team.team_code,
      collegeName: collegeNames.get(team.college_id) ?? "Unknown college",
      leaderName: team.leader_name,
    });
    groupedTeams.set(group, rows);
  }

  const groups = [...groupedTeams.entries()].sort(([groupA], [groupB]) => {
    if (!groupA) return 1;
    if (!groupB) return -1;
    return groupA.localeCompare(groupB);
  });
  const allRows = groups.flatMap(([, rows]) => rows);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <Link
              href="/admin"
              className="text-sm text-zinc-400 hover:text-white"
            >
              ← Back to Admin
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-white">Teams by Group</h1>
          </div>
          <DownloadButton
            rows={allRows}
            filename="HuntX-all-groups.csv"
            label="Download All Groups"
          />
        </header>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
            No teams found.
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([group, rows]) => (
              <section
                key={group || "unassigned"}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-5">
                  <h2 className="text-lg font-semibold text-white">
                    {group ? `Group ${group}` : "No group assigned"}
                    <span className="ml-2 text-sm font-normal text-zinc-400">
                      {rows.length} {rows.length === 1 ? "team" : "teams"}
                    </span>
                  </h2>
                  <DownloadButton
                    rows={rows}
                    filename={`HuntX-${group ? `group-${group}` : "unassigned"}.csv`}
                    label="Download"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-zinc-950/70 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-medium sm:px-5">Team Code</th>
                        <th className="px-4 py-3 font-medium sm:px-5">College Name</th>
                        <th className="px-4 py-3 font-medium sm:px-5">Leader Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {rows.map((team) => (
                        <tr key={team.teamCode} className="text-zinc-200">
                          <td className="px-4 py-3 font-mono sm:px-5">{team.teamCode}</td>
                          <td className="px-4 py-3 sm:px-5">{team.collegeName}</td>
                          <td className="px-4 py-3 sm:px-5">{team.leaderName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function GroupsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-8 text-zinc-400">
          Loading group directory...
        </main>
      }
    >
      <GroupsContent />
    </Suspense>
  );
}
