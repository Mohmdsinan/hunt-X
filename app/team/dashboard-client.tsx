"use client";

import { useRef, useState } from "react";
import { checkTeamQr } from "./actions";
import { QRScanner } from "@/components/QRScanner";

export function TeamDashboardClient() {
  const [questionCode, setQuestionCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string; scanCount?: number; questionCode?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const [solvedQuestions, setSolvedQuestions] = useState<string[]>([]);
  const wrongQrAudioRef = useRef<HTMLAudioElement>(null);

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
      if (res.ok && !solvedQuestions.includes(normalizedQuestionCode)) {
        setSolvedQuestions(prev => [...prev, normalizedQuestionCode]);
      }
    } catch {
      setResult({ ok: false, message: "Could not reach the server. Check your internet and try again." });
    }
    setChecking(false);
  }

  function handleScan(secret: string) {
    setLastScanned(secret);
    handleVerify(secret);
  }

  return (
      <main className="flex-1 mx-auto max-w-xl p-6 space-y-6">
        <audio ref={wrongQrAudioRef} src="/fahhhhh.mp3" preload="auto" />
        <section className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Team Dashboard</h1>
          <p className="text-gray-600">Enter question code and scan the QR code at the location</p>
        </section>

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
          <section className="rounded-lg p-4 text-center">
            <p className={`font-medium ${
              result.ok ? "text-green-800" : "text-red-800"
            }`}>
              {result.message}
            </p>
            {result.ok && result.scanCount !== undefined && (
              <p className="text-sm text-green-600 mt-1">
                This QR has been scanned {result.scanCount} time{result.scanCount !== 1 ? 's' : ''}
              </p>
            )}
            {lastScanned && (
              <p className="text-xs text-gray-500 mt-2">
                Scanned: <code className="font-mono">{lastScanned}</code>
              </p>
            )}
          </section>
        )}

        {/* Solved Questions */}
        {solvedQuestions.length > 0 && (
          <section className="rounded-lg border p-4 space-y-2">
            <h2 className="text-lg font-semibold">Verified Questions ({solvedQuestions.length})</h2>
            <div className="flex flex-wrap gap-2">
              {solvedQuestions.map((q) => (
                <span
                  key={q}
                  className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-mono"
                >
                  {q}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
  );
}