"use client";

import { useEffect, useRef, useState } from "react";
import { teamLogout } from "@/app/login/actions";
import { checkTeamQr, getTeamAccessStatus, getTeamQuestionProgress } from "./actions";
import { QRScanner } from "@/components/QRScanner";
import { createClient } from "@/lib/supabase/client";

export function TeamDashboardClient() {
  const [questionCode, setQuestionCode] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    reason?:
      | "invalid_qr"
      | "duplicate"
      | "max_scans"
      | "disqualified"
      | "hunt_ended"
      | "hunt_unavailable";
    scanCount?: number;
    questionCode?: string;
    disqualificationReason?: string | null;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const [scannedQuestions, setScannedQuestions] = useState<string[]>([]);
  const [questionProgress, setQuestionProgress] = useState<{
    questionCodes: string[];
    scannedQuestionCodes: string[];
  } | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [disqualification, setDisqualification] = useState<{
    reason: string | null;
  } | null>(null);
  const [huntActive, setHuntActive] = useState<boolean | null>(null);
  const [huntStatusError, setHuntStatusError] = useState(false);
  const wrongQrAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let active = true;
    getTeamQuestionProgress()
      .then((progress) => {
        if (!active) return;
        setQuestionProgress(progress);
        setScannedQuestions(progress?.scannedQuestionCodes ?? []);
      })
      .catch((error: unknown) => {
        console.error("Could not load team question progress:", error);
        if (active) setProgressError("Could not load question progress. Please refresh the page.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let checkingStatus = false;
    const supabase = createClient();

    const refreshHuntStatus = async () => {
      if (checkingStatus) return;
      checkingStatus = true;
      try {
        const { data, error } = await supabase
          .from("hunt_status")
          .select("is_active")
          .eq("id", 1)
          .maybeSingle();

        if (error) {
          console.error("Could not fetch hunt status:", error.message);
          if (active) {
            setHuntActive(null);
            setHuntStatusError(true);
          }
          return;
        }
        if (!data) {
          console.error("Hunt status row is missing.");
          if (active) {
            setHuntActive(null);
            setHuntStatusError(true);
          }
          return;
        }

        if (active) {
          setHuntActive(data.is_active);
          setHuntStatusError(false);
        }
      } catch (error: unknown) {
        console.error("Hunt status request failed:", error);
        if (active) {
          setHuntActive(null);
          setHuntStatusError(true);
        }
      } finally {
        checkingStatus = false;
      }
    };

    const channel = supabase
      .channel("hunt-status-team-dashboard")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "hunt_status",
          filter: "id=eq.1",
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (typeof row.is_active === "boolean") {
            setHuntActive(row.is_active);
            setHuntStatusError(false);
          }
        }
      )
      .subscribe((status, error) => {
        if (error) console.error("Hunt status realtime subscription failed:", error);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Hunt status realtime is unavailable; polling will continue.");
        }
      });

    void refreshHuntStatus();
    const interval = window.setInterval(() => {
      if (!document.hidden) void refreshHuntStatus();
    }, 5_000);

    return () => {
      active = false;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let checkingAccess = false;
    const checkAccess = async () => {
      if (checkingAccess) return;
      checkingAccess = true;
      try {
        const status = await getTeamAccessStatus();
        if (active) {
          setDisqualification(
            status?.isDisqualified ? { reason: status.disqualificationReason } : null
          );
        }
      } catch (error: unknown) {
        console.error("Could not verify team access:", error);
      } finally {
        checkingAccess = false;
      }
    };

    void checkAccess();
    const interval = window.setInterval(() => {
      if (!document.hidden) void checkAccess();
    }, 5_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function handleVerify(secret: string) {
    if (huntActive !== true) {
      setResult({
        ok: false,
        message:
          huntActive === false
            ? "The hunt has ended."
            : "Hunt status could not be verified. Scanning is unavailable.",
        reason: huntActive === false ? "hunt_ended" : "hunt_unavailable",
      });
      return;
    }

    const normalizedQuestionCode = questionCode.trim().toUpperCase();
    const normalizedSecret = secret.trim();
    if (!normalizedQuestionCode) {
      setResult({ ok: false, message: "Enter the question code first." });
      return;
    }
    if (!normalizedSecret) {
      setResult({ ok: false, message: "QR code is empty." });
      return;
    }
    if (scannedQuestions.includes(normalizedQuestionCode)) {
      setResult({
        ok: false,
        message: "This QR is already scanned.",
        reason: "duplicate",
      });
      return;
    }

    setChecking(true);
    setResult(null);
    try {
      const res = await checkTeamQr(normalizedQuestionCode, normalizedSecret);
      setResult(res);
      if (res.reason === "hunt_ended") {
        setHuntActive(false);
      } else if (res.reason === "hunt_unavailable") {
        setHuntStatusError(true);
      }
      if (res.reason === "disqualified") {
        setDisqualification({ reason: res.disqualificationReason ?? null });
      }
      if (res.reason === "invalid_qr" && wrongQrAudioRef.current) {
        wrongQrAudioRef.current.currentTime = 0;
        try {
          await wrongQrAudioRef.current.play();
        } catch (error) {
          console.error("Could not play the wrong-QR sound:", error);
        }
      }
      if (res.ok) {
        const verifiedQuestion = res.questionCode ?? normalizedQuestionCode;
        setScannedQuestions((previous) =>
          previous.includes(verifiedQuestion) ? previous : [...previous, verifiedQuestion]
        );
      } else if (res.reason === "duplicate") {
        setScannedQuestions((previous) =>
          previous.includes(normalizedQuestionCode)
            ? previous
            : [...previous, normalizedQuestionCode]
        );
      }
    } catch {
      setResult({ ok: false, message: "Could not reach the server. Check your internet and try again." });
    } finally {
      setChecking(false);
    }
  }

  function handleScan(secret: string) {
    setLastScanned(secret);
    handleVerify(secret);
  }

  const scannedQuestionSet = new Set(scannedQuestions);
  const scannedProgressCount =
    questionProgress?.questionCodes.filter((code) => scannedQuestionSet.has(code)).length ?? 0;

  if (disqualification) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <section className="w-full max-w-md rounded-2xl border border-red-500/50 bg-red-950/50 p-7 text-center shadow-xl shadow-red-950/20">
          <h1 className="text-2xl font-bold text-red-200">You are disqualified</h1>
          {disqualification.reason && (
            <p className="mt-3 text-sm text-red-200/80">
              Reason: {disqualification.reason}
            </p>
          )}
          <form action={teamLogout} className="mt-6">
            <button className="rounded-lg border border-red-300/30 px-5 py-2.5 font-medium text-red-100 transition hover:bg-red-900/50">
              Logout
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-zinc-950 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
        <audio ref={wrongQrAudioRef} src="/fahhhhh.mp3" preload="auto" />

        {huntActive === false ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-950/80 to-amber-950/50 p-5 text-center shadow-lg"
          >
            <h2 className="text-xl font-bold text-red-100">The hunt has ended.</h2>
            <p className="mt-1 text-sm text-red-200/80">
              QR scanning is now closed.
            </p>
          </section>
        ) : huntActive === null ? (
          <p
            role={huntStatusError ? "alert" : "status"}
            className={`rounded-xl border p-4 text-sm ${
              huntStatusError
                ? "border-red-500/40 bg-red-950/40 text-red-200"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            {huntStatusError
              ? "Hunt status could not be verified. Scanning is locked."
              : "Checking hunt status..."}
          </p>
        ) : null}

        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Team Dashboard</h1>
            <p className="text-sm text-zinc-400">
              Enter question code and scan the QR code at the location
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="question-code" className="block text-sm font-medium text-zinc-200">
              Question Code
            </label>
            <input
              id="question-code"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono uppercase tracking-wider text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Question code"
              value={questionCode}
              onChange={(e) => setQuestionCode(e.target.value.toUpperCase())}
              disabled={huntActive !== true}
              autoFocus
            />
          </div>

          {huntActive === true ? (
            <QRScanner
              questionCode={questionCode}
              onScan={handleScan}
              disabled={checking}
            />
          ) : (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl bg-blue-600 py-3.5 font-semibold text-white opacity-50"
            >
              Start scanning
            </button>
          )}

          {result && (
            <section
              className={`rounded-xl border p-4 text-center ${
                result.reason === "duplicate"
                  ? "border-amber-500/30 bg-amber-500/10"
                  : result.ok
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-red-500/30 bg-red-500/10"
              }`}
            >
              <p
                className={`font-medium ${
                  result.reason === "duplicate"
                    ? "text-amber-300"
                    : result.ok
                      ? "text-green-300"
                      : "text-red-300"
                }`}
              >
                {result.message}
              </p>
              {result.ok && result.scanCount !== undefined && (
                <p className="mt-1 text-sm text-green-300">
                  This QR has been scanned {result.scanCount} time{result.scanCount !== 1 ? "s" : ""}
                </p>
              )}
              {lastScanned && (
                <p className="mt-2 text-xs text-zinc-400">
                  Scanned: <code className="font-mono">{lastScanned}</code>
                </p>
              )}
            </section>
          )}
        </section>

        {questionProgress && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Questions Progress</h2>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-zinc-300">
                {scannedProgressCount}/{questionProgress.questionCodes.length} scanned
              </span>
            </div>
            {questionProgress.questionCodes.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                {questionProgress.questionCodes.map((code) => {
                  const scanned = scannedQuestionSet.has(code);
                  return (
                    <div
                      key={code}
                      className={`rounded-xl border p-3 transition ${
                        scanned
                          ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                          : "border-zinc-800/80 bg-zinc-900/70 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-white">{code}</span>
                        {scanned && (
                          <span
                            aria-label="Scanned"
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-emerald-950"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs">{scanned ? "Scanned" : "Not Scanned"}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
                This team has no group assigned.
              </p>
            )}
          </section>
        )}
        {progressError && (
          <p role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {progressError}
          </p>
        )}
      </div>
    </main>
  );
}