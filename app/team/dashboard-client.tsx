"use client";

import { useEffect, useRef, useState } from "react";
import { checkTeamQr, getTeamQuestionProgress } from "./actions";
import { QRScanner } from "@/components/QRScanner";

export function TeamDashboardClient() {
  const [questionCode, setQuestionCode] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    reason?: "invalid_qr" | "duplicate";
    scanCount?: number;
    questionCode?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const [scannedQuestions, setScannedQuestions] = useState<string[]>([]);
  const [questionProgress, setQuestionProgress] = useState<{
    questionCodes: string[];
    scannedQuestionCodes: string[];
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
      <main className="flex-1 mx-auto max-w-xl p-6 space-y-6">
        <audio ref={wrongQrAudioRef} src="/fahhhhh.mp3" preload="auto" />
        <section className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Team Dashboard</h1>
          <p className="text-gray-600">Enter question code and scan the QR code at the location</p>
        </section>

        {questionProgress && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Questions Progress</h2>
              <span className="text-sm text-zinc-400">
                {scannedProgressCount}/{questionProgress.questionCodes.length} scanned
              </span>
            </div>
            {questionProgress.questionCodes.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {questionProgress.questionCodes.map((code) => {
                  const scanned = scannedQuestionSet.has(code);
                  return (
                    <div
                      key={code}
                      className={`rounded-lg border p-3 ${
                        scanned
                          ? "border-emerald-500/50 bg-emerald-950/40"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-white">{code}</span>
                        {scanned && (
                          <span
                            aria-label="Scanned"
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-emerald-950"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <p className={`mt-2 text-xs ${scanned ? "text-emerald-300" : "text-zinc-500"}`}>
                        {scanned ? "Scanned" : "Not Scanned"}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
                This team has no group assigned.
              </p>
            )}
          </section>
        )}
        {progressError && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {progressError}
          </p>
        )}

        {/* Question Code Input */}
        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Question Code</h2>
          <input
            className="w-full rounded border p-3 text-lg font-mono uppercase tracking-wider"
            placeholder="e.g., C-01"
            value={questionCode}
            onChange={(e) => setQuestionCode(e.target.value.toUpperCase())}
            autoFocus
          />
        </section>

        {/* QR Scanner */}
        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold">QR Scanner</h2>
          <QRScanner
            questionCode={questionCode}
            onScan={handleScan}
            disabled={checking}
          />
        </section>

        {/* Result */}
        {result && (
          <section
            className={`rounded-lg border p-4 text-center ${
              result.reason === "duplicate"
                ? "border-amber-500/30 bg-amber-500/10"
                : result.ok
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-red-500/30 bg-red-500/10"
            }`}
          >
            <p className={`font-medium ${
              result.reason === "duplicate"
                ? "text-amber-300"
                : result.ok
                  ? "text-green-300"
                  : "text-red-300"
            }`}>
              {result.message}
            </p>
            {result.ok && result.scanCount !== undefined && (
              <p className="text-sm text-green-300 mt-1">
                This QR has been scanned {result.scanCount} time{result.scanCount !== 1 ? 's' : ''}
              </p>
            )}
            {lastScanned && (
              <p className="text-xs text-zinc-400 mt-2">
                Scanned: <code className="font-mono">{lastScanned}</code>
              </p>
            )}
          </section>
        )}
      </main>
  );
}