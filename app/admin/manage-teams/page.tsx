import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import TeamsManager from "../teams-manager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function ManageTeamsContent() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");

  const db = createAdminClient();
  const [teams, colleges] = await Promise.all([
    db
      .from("teams")
      .select("id, team_code, reg_id, leader_name, group_name, college_id, is_finalist")
      .order("team_code"),
    db.from("colleges").select("id, name").order("name"),
  ]);

  const error = teams.error ?? colleges.error;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-sm text-zinc-600 hover:text-black"
          >
            ← Back to Admin
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Manage Teams</h1>
        </div>
      </div>
      {error ? (
        <p role="alert" className="rounded bg-red-100 p-3 text-red-800">
          Could not load data: {error.message}
        </p>
      ) : (
        <TeamsManager teams={teams.data ?? []} colleges={colleges.data ?? []} />
      )}
    </main>
  );
}

export default function ManageTeamsPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading team management...</p>}>
      <ManageTeamsContent />
    </Suspense>
  );
}
