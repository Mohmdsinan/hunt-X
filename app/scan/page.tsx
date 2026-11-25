"use client";

import { useEffect, useRef, useState } from "react";
import { checkQr } from "./actions";

type Result = { ok: boolean; message: string } | null;

export default function ScanPage() {
  const [question, setQuestion] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const questionRef = useRef("");
  const scannerRef = useRef<any>(null);
  const busyRef = useRef(false);

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // ignore
    }
    scannerRef.current = null;
    setScanning(false);
  }

  async function startScan() {
    if (!question.trim()) {
      setResult({ ok: false, message: "Enter the question code first." });
      return;
    }
    setResult(null);
    busyRef.current = false;
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (text: string) => {
          if (busyRef.current) return;
          busyRef.current = true;
          await stopScanner();
          const res = await checkQr(questionRef.current, text);
          setResult(res);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      setResult({
        ok: false,
        message: "Cannot open the camera. Allow camera access and use https.",
      });
    }
  }

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
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

      <div id="reader" className="w-full" />

      {!scanning ? (
        <button
          onClick={startScan}
          className="w-full rounded bg-black p-3 text-white"
        >
          Start scanning
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="w-full rounded border p-3"
        >
          Cancel
        </button>
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
    </main>
  );
}