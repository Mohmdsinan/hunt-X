"use client";

import { useEffect, useRef, useState } from "react";
import type QrScannerType from "qr-scanner";

interface QRScannerProps {
  onScan: (secret: string) => void;
  disabled?: boolean;
  questionCode: string;
}

function normalizeScannedCode(raw: string): string {
  return raw.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

export function QRScanner({ onScan, disabled = false, questionCode }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [lastRead, setLastRead] = useState("");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
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

  async function startScan() {
    if (disabled) return;
    if (!questionCode.trim()) {
      setError("Enter the question code first.");
      return;
    }
    setError(null);
    setLastRead("");
    busyRef.current = false;
    setScanning(true);

    try {
      const QrScanner = (await import("qr-scanner")).default;
      const scanner = new QrScanner(
        videoRef.current!,
        (res) => {
          if (busyRef.current) return;
          const secret = normalizeScannedCode(res.data);
          if (!secret) return;
          busyRef.current = true;
          setLastRead(secret);
          stopScanner();
          onScan(secret);
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
    } catch (error: unknown) {
      scannerRef.current = null;
      setScanning(false);
      const message = error instanceof Error ? error.message : String(error);
      setError("Cannot open the camera: " + message);
    }
  }

  useEffect(() => {
    return () => stopScanner();
  }, []);

  return (
    <div className="space-y-3">
      <div className={scanning ? "relative w-full" : "hidden"}>
        <video ref={videoRef} className="aspect-video w-full rounded-xl object-cover" playsInline muted />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="text-white text-lg font-medium">Scanning...</p>
        </div>
      </div>

      {!scanning ? (
        <button
          onClick={startScan}
          disabled={disabled || !questionCode.trim()}
          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start scanning
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="w-full rounded-xl border border-zinc-700 py-3 text-zinc-200 transition hover:bg-zinc-800"
        >
          Cancel scanning
        </button>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {lastRead && (
        <p className="text-center text-sm text-zinc-400">
          Read from QR: <code className="font-mono">{lastRead}</code>
        </p>
      )}

    </div>
  );
}