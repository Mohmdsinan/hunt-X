"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type AnalyticsScan = {
  teamCode: string;
  leaderName: string;
  collegeName: string;
  scannedAt: string;
};

export type AnalyticsQr = {
  questionCode: string;
  group: string;
  details: Record<string, string>;
  scans: AnalyticsScan[];
};

const GROUP_FILTERS = ["All", "A", "B", "C", "D"] as const;

function detailLabel(key: string): string {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      });
}

export default function QrAnalyticsClient({ qrs }: { qrs: AnalyticsQr[] }) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<(typeof GROUP_FILTERS)[number]>("All");

  const totalScans = qrs.reduce((total, qr) => total + qr.scans.length, 0);
  const fullCapacity = qrs.filter((qr) => qr.scans.length >= 4).length;
  const visibleQrs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return qrs.filter((qr) => {
      if (groupFilter !== "All" && qr.group !== groupFilter) return false;
      if (!query) return true;
      const searchable = [
        qr.questionCode,
        ...Object.values(qr.details),
        ...qr.scans.flatMap((scan) => [scan.teamCode, scan.leaderName, scan.collegeName]),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [groupFilter, qrs, search]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">
              ← Back to Admin
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              QR Analytics &amp; Scan Logs
            </h1>
          </div>
          <p className="text-sm text-zinc-500">Maximum 4 teams per question code</p>
        </header>

        <section aria-label="QR scan summary" className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Total QR Codes" value={qrs.length} />
          <SummaryCard label="Total Scans Recorded" value={totalScans} />
          <SummaryCard label="QRs at Full Capacity" value={fullCapacity} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="sr-only" htmlFor="qr-search">
              Search question codes, QR details, or teams
            </label>
            <input
              id="qr-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search question code, QR payload, or team code"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 sm:max-w-md"
            />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by group">
              {GROUP_FILTERS.map((group) => (
                <button
                  key={group}
                  type="button"
                  aria-pressed={groupFilter === group}
                  onClick={() => setGroupFilter(group)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    groupFilter === group
                      ? "border-blue-500/50 bg-blue-500/15 text-blue-200"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  {group === "All" ? "All" : `Group ${group}`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {visibleQrs.map((qr) => (
              <QrCard key={qr.questionCode} qr={qr} />
            ))}
            {visibleQrs.length === 0 && (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
                No QR codes match your search.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function QrCard({ qr }: { qr: AnalyticsQr }) {
  const scanCount = qr.scans.length;
  const capacityClass =
    scanCount >= 4
      ? "bg-red-500/15 text-red-300"
      : scanCount >= 3
        ? "bg-amber-500/15 text-amber-300"
        : scanCount > 0
          ? "bg-blue-500/15 text-blue-300"
          : "bg-zinc-800 text-zinc-400";
  const detailEntries = Object.entries(qr.details).filter(
    ([key, value]) =>
      value &&
      !["id", "created_at", "updated_at"].includes(key) &&
      !key.endsWith("_id")
  );

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-lg font-semibold text-white">
            {qr.questionCode}
            <span className="mx-2 text-zinc-600">•</span>
            <span className="font-sans text-base font-medium text-zinc-300">
              {qr.group === "Other" ? "Other" : `Group ${qr.group}`}
            </span>
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${capacityClass}`}>
          {scanCount >= 4 ? "4/4 Full" : `${scanCount}/4 Scanned`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`${scanCount} of 4 scans`}>
        {[0, 1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 rounded-full ${
              segment < scanCount
                ? scanCount >= 4
                  ? "bg-red-400"
                  : scanCount >= 3
                    ? "bg-amber-400"
                    : "bg-blue-400"
                : "bg-zinc-700"
            }`}
          />
        ))}
      </div>

      {detailEntries.length > 0 && (
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {detailEntries.map(([key, value]) => (
            <div key={key} className="min-w-0 rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
              <dt className="text-xs font-medium text-zinc-500">{detailLabel(key)}</dt>
              <dd className="mt-1 break-words whitespace-pre-wrap text-sm text-zinc-200">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-zinc-200">Teams Who Scanned</h3>
        {qr.scans.length === 0 ? (
          <p className="mt-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3 text-sm text-zinc-500">
            Not scanned by any team yet
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {qr.scans.slice(0, 4).map((scan, index) => (
              <li
                key={`${scan.teamCode}-${scan.scannedAt}`}
                className="grid gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3 sm:grid-cols-[3rem_1fr_auto] sm:items-center"
              >
                <span className="text-xs font-semibold text-zinc-500">#{index + 1}</span>
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {scan.teamCode}
                    <span className="mx-2 text-zinc-600">·</span>
                    <span className="font-normal text-zinc-300">{scan.leaderName}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{scan.collegeName}</p>
                </div>
                <time
                  dateTime={scan.scannedAt}
                  className="text-xs text-zinc-400 sm:text-right"
                >
                  {formatTime(scan.scannedAt)}
                </time>
              </li>
            ))}
            {qr.scans.length > 4 && (
              <li className="text-xs text-amber-300">
                {qr.scans.length - 4} additional scan record(s) exceed the configured limit.
              </li>
            )}
          </ol>
        )}
      </section>
    </article>
  );
}
