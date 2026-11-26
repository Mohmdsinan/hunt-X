"use client";

import { useState, useTransition } from "react";
import { setHuntActive, type HuntStatus } from "./actions";

export default function HuntStatusControl({
  initialStatus,
  loadError,
}: {
  initialStatus: HuntStatus | null;
  loadError: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function updateStatus(isActive: boolean) {
    startTransition(async () => {
      const result = await setHuntActive(isActive);
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok && result.status) setStatus(result.status);
    });
  }

  return (
    <section
      aria-labelledby="hunt-status-title"
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="hunt-status-title" className="text-lg font-semibold text-white">
            Hunt Status Control
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Start or stop QR scanning for all teams.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide ${
            status?.is_active
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : status
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-zinc-700 bg-zinc-800 text-zinc-400"
          }`}
        >
          {status ? (status.is_active ? "LIVE / ACTIVE" : "STOPPED / ENDED") : "STATUS UNAVAILABLE"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => updateStatus(true)}
          disabled={pending || !status || status.is_active}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending && !status?.is_active ? "Starting..." : "Start Hunt"}
        </button>
        <button
          type="button"
          onClick={() => updateStatus(false)}
          disabled={pending || !status || !status.is_active}
          className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending && status?.is_active ? "Stopping..." : "Stop Hunt"}
        </button>
      </div>

      {(loadError || message) && (
        <p
          role={loadError || (message && !message.ok) ? "alert" : "status"}
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            loadError || (message && !message.ok)
              ? "border-red-500/30 bg-red-950/40 text-red-200"
              : "border-zinc-700 bg-zinc-950 text-zinc-300"
          }`}
        >
          {loadError ?? message?.text}
        </p>
      )}
    </section>
  );
}
