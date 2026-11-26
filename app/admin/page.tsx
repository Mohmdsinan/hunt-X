import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { logout } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function AdminHub() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold tracking-tight">HuntX Admin</h1>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Log out
            </button>
          </form>
        </header>

        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">
            Admin control panel
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/manage-teams"
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-blue-500/60 hover:bg-zinc-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <h3 className="text-xl font-semibold text-white">Manage Teams</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Add, update, remove, import, and organize teams.
              </p>
              <span className="mt-6 inline-block text-sm font-medium text-blue-300 group-hover:text-blue-200">
                Open team management →
              </span>
            </Link>

            <Link
              href="/admin/groups"
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-emerald-500/60 hover:bg-zinc-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <h3 className="text-xl font-semibold text-white">Teams by Group</h3>
              <p className="mt-2 text-sm text-zinc-400">
                View group rosters and download CSVs for organizers.
              </p>
              <span className="mt-6 inline-block text-sm font-medium text-emerald-300 group-hover:text-emerald-200">
                Open group directory →
              </span>
            </Link>

            <Link
              href="/admin/qr-stats"
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-violet-500/60 hover:bg-zinc-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
            >
              <h3 className="text-xl font-semibold text-white">QR Analytics &amp; Scans</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Review QR details, scan capacity, and chronological team scan logs.
              </p>
              <span className="mt-6 inline-block text-sm font-medium text-violet-300 group-hover:text-violet-200">
                Open QR analytics →
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-8 text-zinc-400">
          Loading admin panel...
        </main>
      }
    >
      <AdminHub />
    </Suspense>
  );
}
