import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import TeamsManager from "./teams-manager";
import { logout } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function AdminContent() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");

  const db = createAdminClient();
  const [teams, colleges] = await Promise.all([
    db
      .from("teams")
      .select("id, team_code, reg_id, leader_name, group_name, college_id")
      .order("team_code"),
    db.from("colleges").select("id, name").order("name"),
  ]);

  const err = teams.error ?? colleges.error;
  if (err) return <p className="text-red-600">Could not load data: {err.message}</p>;

  return <TeamsManager teams={teams.data ?? []}
  colleges={colleges.data ?? []}
/>;
}

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <form action={logout}>
          <button className="rounded border px-3 py-2 text-sm">Log out</button>
        </form>
      </div>
      <Suspense fallback={<p>Loading...</p>}>
        <AdminContent />
      </Suspense>
    </main>
  );
}