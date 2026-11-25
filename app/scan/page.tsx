"use client";

import { useEffect, useRef, useState } from "react";
import { checkQr } from "./actions";

type Result = { ok: boolean; message: string } | null;

export default function ScanPage() {
  const [question, setQuestion] = useState("");
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [lastRead, setLastRead] = useState("");

  const questionRef = useRef("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const busyRef = useRef(false);

  function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (scanner) {
      scanner.stop();
      scanner.destroy();
    }
  }

  async function verify(secret: string) {
    setChecking(true);
    try {
      const res = await checkQr(questionRef.current, secret);
      setResult(res);
    } catch {
      setResult({
        ok: false,
        message: "Could not reach the server. Check your internet and try again.",
      });
    }
    setChecking(false);
  }

  async function startScan() {
    if (!question.trim()) {
      setResult({ ok: false, message: "Enter the question code first." });
      return;
    }
    setResult(null);
    setLastRead("");
    busyRef.current = false;
    setScanning(true);

    try {
      const QrScanner = (await import("qr-scanner")).default;

      const scanner = new QrScanner(
        videoRef.current!,
        (res: { data: string }) => {
          if (busyRef.current) return;
          busyRef.current = true;
          setLastRead(res.data);
          stopScanner();
          verify(res.data);
        },
        {
          preferredCamera: "environment",
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 15,
          onDecodeError: () => {},
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
    } catch (e: any) {
      scannerRef.current = null;
      setScanning(false);
      setResult({
        ok: false,
        message: "Cannot open the camera: " + (e?.message || String(e)),
      });
    }
  }

  useEffect(() => {
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Scan QR</h1>

      <input
        className="w-full rounded border p-3 text-lg"
        placeholder="Question code"
        value={question}
        onChange={(e) => {
          setQuestion(e.target.value);
          questionRef.current = e.target.value;
        }}
        disabled={scanning}
      />

      <div className={scanning ? "relative w-full" : "hidden"}>
        <video ref={videoRef} className="w-full rounded" playsInline muted />
      </div>

      {!scanning ? (
        <button
          onClick={startScan}
          className="w-full rounded bg-black p-3 text-white"
        >
          Start scanning
        </button>
      ) : (
        <button onClick={stopScanner} className="w-full rounded border p-3">
          Cancel
        </button>
      )}

      {checking && <p className="text-center">Checking...</p>}

      {lastRead && (
        <p className="text-center text-sm text-gray-500">
          Read from QR: {lastRead}
        </p>
      )}

      {result && (
        <p
          className={`rounded p-3 text-center font-medium ${
            result.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {result.message}
        </p>
      )}

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm text-gray-500">Test without camera:</p>
        <input
          className="w-full rounded border p-3"
          placeholder="Type the secret code"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button
          onClick={() => {
            questionRef.current = question;
            verify(manual);
          }}
          className="w-full rounded border p-3"
        >
          Check typed code
        </button>
      </div>
    </main>
  );
}