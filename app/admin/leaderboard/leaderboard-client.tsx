"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type LeaderboardTeam = {
  id: string;
  teamCode: string;
  leaderName: string;
  collegeName: string;
  groupName: string | null;
  isFinalist: boolean;
  scans: { questionCode: string; scannedAt: string }[];
  rank: number;
};

const GROUPS = ["All", "A", "B", "C", "D"] as const;
const QUESTION_COUNT = 12;

function normalizedCode(value: string): string {
  return value.trim().toUpperCase();
}

function groupCode(value: string | null): string {
  return value?.trim().replace(/^group\s+/i, "").toUpperCase() ?? "";
}

function formatScanTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      });
}

export default function LeaderboardClient({ teams }: { teams: LeaderboardTeam[] }) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<(typeof GROUPS)[number]>("All");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const visibleTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teams.filter((team) => {
      if (groupFilter !== "All" && groupCode(team.groupName) !== groupFilter) return false;
      if (!query) return true;
      return [
        team.teamCode,
        team.leaderName,
        team.collegeName,
        team.groupName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [groupFilter, search, teams]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="border-b border-zinc-800 pb-5">
          <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">
            ← Back to Admin
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Leaderboard &amp; Team Scans
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Teams are ranked by total scans, with the earliest latest scan breaking ties.
          </p>
        </header>

        <section aria-label="Filter teams" className="space-y-4">
          <label className="sr-only" htmlFor="team-search">
            Search by team code, leader, college, or group
          </label>
          <input
            id="team-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search team code, leader, college, or group"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by group">
            {GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                aria-pressed={groupFilter === group}
                onClick={() => setGroupFilter(group)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  groupFilter === group
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                {group === "All" ? "All" : `Group ${group}`}
              </button>
            ))}
          </div>
        </section>

        {visibleTeams.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
            {teams.length === 0
              ? "No teams registered yet."
              : "No teams match your search and group filter."}
          </p>
        ) : (
          <ol className="space-y-3">
            {visibleTeams.map((team) => {
              const isExpanded = expandedTeamId === team.id;
              return (
                <li key={team.id}>
                  <article>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`team-scans-${team.id}`}
                      onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:bg-zinc-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-2 font-mono text-sm font-semibold text-amber-200">
                          #{team.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-lg font-semibold text-white">
                              {team.teamCode}
                            </span>
                            <span className="text-sm text-zinc-400">
                              {team.groupName
                                ? `Group ${groupCode(team.groupName)}`
                                : "Group not assigned"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-zinc-300">
                            {team.leaderName}
                            <span className="mx-2 text-zinc-600">·</span>
                            <span className="text-zinc-400">{team.collegeName}</span>
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-100">
                          {groupQuestionScanCount(team)} / {QUESTION_COUNT} Scanned
                        </span>
                        {hasFinalScan(team) && (
                          <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-200">
                            TX-00
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className={`ml-auto text-zinc-500 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          ⌄
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <TeamScanDetails
                        team={team}
                        id={`team-scans-${team.id}`}
                      />
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}

function groupQuestionScanCount(team: LeaderboardTeam): number {
  return team.scans.filter((scan) => {
    const code = normalizedCode(scan.questionCode);
    return /^([A-D])-\d{2}$/.test(code) && code.startsWith(`${groupCode(team.groupName)}-`);
  }).length;
}

function hasFinalScan(team: LeaderboardTeam): boolean {
  return team.scans.some((scan) => normalizedCode(scan.questionCode) === "TX-00");
}

function TeamScanDetails({ team, id }: { team: LeaderboardTeam; id: string }) {
  const scannedCodes = new Set(team.scans.map((scan) => normalizedCode(scan.questionCode)));
  const group = groupCode(team.groupName);
  const remainingCodes = group
    ? Array.from(
        { length: QUESTION_COUNT },
        (_, index) => `${group}-${String(index + 1).padStart(2, "0")}`
      ).filter((code) => !scannedCodes.has(code))
    : [];
  const chronologicalScans = [...team.scans].sort((a, b) =>
    a.scannedAt.localeCompare(b.scannedAt)
  );

  return (
    <section
      id={id}
      aria-label={`${team.teamCode} scan details`}
      className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="font-mono text-lg font-semibold text-white">{team.teamCode}</h2>
          <p className="mt-1 text-sm text-zinc-300">{team.leaderName}</p>
          <p className="text-sm text-zinc-500">{team.collegeName}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {team.groupName ? `Group ${group}` : "Group not assigned"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-400">Total scans</p>
          <p className="mt-1 text-xl font-semibold text-white">{team.scans.length}</p>
          {hasFinalScan(team) && (
            <span className="mt-2 inline-block rounded-full border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-200">
              TX-00 scanned
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-zinc-200">Scanned QR codes</h3>
        {chronologicalScans.length === 0 ? (
          <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
            No QR codes scanned by this team yet.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {chronologicalScans.map((scan, index) => (
              <li
                key={`${scan.questionCode}-${scan.scannedAt}-${index}`}
                className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 sm:grid-cols-[3.5rem_1fr_auto] sm:items-center"
              >
                <span className="text-xs font-semibold text-zinc-500">#{index + 1}</span>
                <span
                  className={`font-mono text-sm font-semibold ${
                    normalizedCode(scan.questionCode) === "TX-00"
                      ? "text-amber-200"
                      : "text-zinc-100"
                  }`}
                >
                  {scan.questionCode}
                </span>
                <time
                  dateTime={scan.scannedAt}
                  className="text-xs text-zinc-400 sm:text-right"
                >
                  {formatScanTime(scan.scannedAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>

      {remainingCodes.length > 0 && (
        <div className="mt-5 border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold text-zinc-400">Unscanned group codes</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {remainingCodes.map((code) => (
              <li
                key={code}
                className="rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 font-mono text-xs text-zinc-600"
              >
                {code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
