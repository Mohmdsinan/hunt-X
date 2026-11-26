import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import DisqualifyClient from "./disqualify-client";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function DisqualifyContent() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");

  const db = createAdminClient();
  const [teamsResult, collegesResult] = await Promise.all([
    db
      .from("teams")
      .select("id, team_code, group_name, leader_name, college_id, disqualification_reason")
      .eq("is_disqualified", true)
      .order("team_code"),
    db.from("colleges").select("id, name"),
  ]);
  const error = teamsResult.error ?? collegesResult.error;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-zinc-800 pb-5">
          <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">
            ← Back to Admin
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Disqualify Teams
          </h1>
        </header>
        {error ? (
          <p role="alert" className="rounded-lg border border-rose-900 bg-rose-950/40 p-4 text-rose-200">
            Could not load disqualified teams. Apply the team disqualification database migration and try again.
          </p>
        ) : (
          <DisqualifyClient
            teams={(teamsResult.data ?? []).map((team) => ({
              id: team.id,
              team_code: team.team_code,
              group_name: team.group_name,
              leader_name: team.leader_name,
              college_name:
                (collegesResult.data ?? []).find((college) => college.id === team.college_id)?.name ??
                "Unknown college",
              disqualification_reason: team.disqualification_reason,
            }))}
          />
        )}
      </div>
    </main>
  );
}

export default function DisqualifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-8 text-zinc-400">
          Loading disqualification tools...
        </main>
      }
    >
      <DisqualifyContent />
    </Suspense>
  );
}
