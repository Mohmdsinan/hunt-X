"use client";

import { useState, useTransition } from "react";
import {
  disqualifyTeam,
  reinstateTeam,
  type DisqualifyActionResult,
} from "./actions";

type DisqualifiedTeam = {
  id: string;
  team_code: string;
  group_name: string | null;
  leader_name: string;
  college_name: string;
  disqualification_reason: string | null;
};

export default function DisqualifyClient({
  teams,
}: {
  teams: DisqualifiedTeam[];
}) {
  const [teamCode, setTeamCode] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<DisqualifyActionResult | null>(null);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitDisqualification() {
    if (pending || !teamCode.trim()) return;
    startTransition(async () => {
      const result = await disqualifyTeam(teamCode, reason);
      setMessage(result);
      if (result.ok) {
        setTeamCode("");
        setReason("");
      }
    });
  }

  function reinstate(id: string) {
    setPendingTeamId(id);
    startTransition(async () => {
      setMessage(await reinstateTeam(id));
      setPendingTeamId(null);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Disqualify a team</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Disqualified teams cannot log in or submit QR scans.
        </p>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            submitDisqualification();
          }}
        >
          <div className="space-y-2">
            <label htmlFor="disqualify-team-code" className="text-sm font-medium text-zinc-200">
              Team Code
            </label>
            <input
              id="disqualify-team-code"
              value={teamCode}
              onChange={(event) => setTeamCode(event.target.value)}
              required
              maxLength={100}
              placeholder="e.g. TH12"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono uppercase text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="disqualify-reason" className="text-sm font-medium text-zinc-200">
              Reason <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              id="disqualify-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="e.g. Rule violation"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !teamCode.trim()}
            onClick={submitDisqualification}
            className="rounded-lg bg-rose-700 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Updating..." : "Disqualify Team"}
          </button>
        </form>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              message.ok
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
                : "border-rose-500/30 bg-rose-950/40 text-rose-200"
            }`}
          >
            {message.message}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Disqualified Teams</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {teams.length} team{teams.length === 1 ? "" : "s"} currently disqualified
          </p>
        </div>
        {teams.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-400">
            No teams are currently disqualified.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-zinc-950/70 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Team Code</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Leader Name</th>
                  <th className="px-4 py-3 font-medium">College Name</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {teams.map((team) => (
                  <tr key={team.id} className="text-zinc-200">
                    <td className="px-4 py-3 font-mono">{team.team_code}</td>
                    <td className="px-4 py-3">
                      {team.group_name ? `Group ${team.group_name}` : "—"}
                    </td>
                    <td className="px-4 py-3">{team.leader_name}</td>
                    <td className="px-4 py-3">{team.college_name}</td>
                    <td className="max-w-xs whitespace-pre-wrap px-4 py-3 text-zinc-400">
                      {team.disqualification_reason || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => reinstate(team.id)}
                        className="rounded-lg border border-emerald-500/30 px-3 py-1.5 font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        {pendingTeamId === team.id ? "Reinstating..." : "Reinstate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
