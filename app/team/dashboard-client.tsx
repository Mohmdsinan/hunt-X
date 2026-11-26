"use client";

import { useEffect, useRef, useState } from "react";
import { checkTeamQr, getTeamQuestionProgress } from "./actions";
import { QRScanner } from "@/components/QRScanner";

export function TeamDashboardClient() {
  const [questionCode, setQuestionCode] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    reason?: "invalid_qr" | "duplicate" | "max_scans" | "not_qualified";
    scanCount?: number;
    questionCode?: string;
    finalRank?: number;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const [scannedQuestions, setScannedQuestions] = useState<string[]>([]);
  const [questionProgress, setQuestionProgress] = useState<{
    questionCodes: string[];
    scannedQuestionCodes: string[];
    isFinalist: boolean;
    finalScanAt: string | null;
    finalRank: number | null;
  } | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
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

  async function handleVerify(secret: string) {
    const normalizedQuestionCode = questionCode.trim().toUpperCase();
    const normalizedSecret = secret.trim();
    if (!normalizedQuestionCode) {
      setResult({ ok: false, message: "Enter the question code first." });
      return;
    }
    if (normalizedQuestionCode === "TX-00" && questionProgress && !questionProgress.isFinalist) {
      setResult({
        ok: false,
        message: "You are not selected for the Final Stage.",
        reason: "not_qualified",
      });
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
      if (res.ok && normalizedQuestionCode === "TX-00") {
        setQuestionProgress((previous) =>
          previous
            ? {
                ...previous,
                finalRank: res.finalRank ?? previous.finalRank,
                finalScanAt: new Date().toISOString(),
                scannedQuestionCodes: previous.scannedQuestionCodes.includes("TX-00")
                  ? previous.scannedQuestionCodes
                  : [...previous.scannedQuestionCodes, "TX-00"],
              }
            : previous
        );
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

  return (
    <main className="flex-1 bg-zinc-950 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
        <audio ref={wrongQrAudioRef} src="/fahhhhh.mp3" preload="auto" />

        {questionProgress?.isFinalist && (
          <section
            aria-live="polite"
            className="rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-yellow-500/5 p-5 shadow-lg shadow-amber-950/20"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              Final Stage Unlocked • TX-00
            </p>
            <h2 className="mt-2 text-xl font-bold text-amber-100">
              {questionProgress.finalRank !== null
                ? `Completed! You finished #${questionProgress.finalRank}`
                : questionProgress.finalScanAt
                  ? "Final Stage completed!"
                  : "Find the hidden TX-00 QR code"}
            </h2>
            {!questionProgress.finalScanAt && (
              <p className="mt-1 text-sm text-amber-200/80">
                Enter TX-00 above and scan its QR code to finish.
              </p>
            )}
          </section>
        )}

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
              autoFocus
            />
          </div>

          <QRScanner
            questionCode={questionCode}
            onScan={handleScan}
            disabled={checking}
          />

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