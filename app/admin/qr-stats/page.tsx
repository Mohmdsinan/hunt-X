import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import QrAnalyticsClient, {
  type AnalyticsQr,
  type AnalyticsScan,
} from "./qr-analytics-client";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const GROUPS = ["A", "B", "C", "D"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function printableValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

async function QrAnalyticsContent() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");

  const supabase = createAdminClient();
  const [{ data: qrRows, error: qrError }, { data: scanRows, error: scanError }, { data: teams, error: teamError }, { data: colleges, error: collegeError }] =
    await Promise.all([
      supabase.from("qr_codes").select("*"),
      supabase.from("team_qr_scans").select("team_id, question_code, scanned_at"),
      supabase.from("teams").select("id, team_code, leader_name, college_id, group_name"),
      supabase.from("colleges").select("id, name"),
    ]);

  const error = qrError ?? scanError ?? teamError ?? collegeError;
  if (error) {
    console.error("Could not load QR analytics:", error.message);
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-xl border border-red-900 bg-red-950/40 p-5 text-red-200">
          Could not load QR analytics. Check that the QR analytics database migration has been applied.
        </div>
      </main>
    );
  }

  const qrDetailsByCode = new Map<string, Record<string, string>>();
  for (const rawRow of qrRows ?? []) {
    if (!isRecord(rawRow)) continue;
    const code = printableValue(rawRow.question_code).trim().toUpperCase();
    if (!code) continue;
    qrDetailsByCode.set(
      code,
      Object.fromEntries(
        Object.entries(rawRow).map(([key, value]) => [key, printableValue(value)])
      )
    );
  }

  const teamById = new Map((teams ?? []).map((team) => [team.id, team]));
  const collegeNameById = new Map((colleges ?? []).map((college) => [college.id, college.name]));
  const scansByCode = new Map<string, AnalyticsScan[]>();

  for (const scan of scanRows ?? []) {
    const code = scan.question_code.trim().toUpperCase();
    const team = teamById.get(scan.team_id);
    const scans = scansByCode.get(code) ?? [];
    scans.push({
      teamCode: team?.team_code ?? "Unknown team",
      leaderName: team?.leader_name ?? "Unknown leader",
      collegeName: team ? collegeNameById.get(team.college_id) ?? "Unknown college" : "Unknown college",
      scannedAt: scan.scanned_at,
    });
    scansByCode.set(code, scans);
  }

  for (const scans of scansByCode.values()) {
    scans.sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
  }

  const codes = new Set<string>();
  for (const group of GROUPS) {
    for (let question = 1; question <= 12; question += 1) {
      codes.add(`${group}-${String(question).padStart(2, "0")}`);
    }
  }
  for (const code of qrDetailsByCode.keys()) codes.add(code);
  for (const code of scansByCode.keys()) codes.add(code);

  const qrs: AnalyticsQr[] = [...codes]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((questionCode) => ({
      questionCode,
      group: GROUPS.find((group) => questionCode.startsWith(`${group}-`)) ?? "Other",
      details: qrDetailsByCode.get(questionCode) ?? {},
      scans: scansByCode.get(questionCode) ?? [],
    }));

  return <QrAnalyticsClient qrs={qrs} />;
}

export default function QrAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-8 text-zinc-400">
          Loading QR analytics...
        </main>
      }
    >
      <QrAnalyticsContent />
    </Suspense>
  );
}
