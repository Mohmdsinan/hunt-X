"use client";

import { useRef, useState, useTransition } from "react";
import {
  commitImport,
  previewImport,
  type PreviewResult,
} from "./import-actions";

const TEMPLATE = "Reg ID,College / Institution,Leader Name\n";

export default function ImportPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(f: File | null) {
    setFile(f);
    setPreview(null);
    setDone(null);
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    startTransition(async () => {
      setPreview(await previewImport(fd));
    });
  }

  function onImport() {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const r = await commitImport(fd);
      if (r.ok) {
        setDone(r.message);
        setPreview(null);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        setPreview({
          ok: false,
          message: r.message,
          rows: preview?.rows ?? [],
          groupSizes: preview?.groupSizes ?? null,
        });
      }
    });
  }

  return (
    <div className="space-y-4 rounded border p-4">
      <div className="space-y-2 text-sm">
        <p className="font-medium">Import teams from a file (.xlsx or .csv)</p>
        <p>Row 1 must be the header. Example:</p>
        <div className="overflow-x-auto">
          <table className="border text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Reg ID</th>
                <th className="border p-2">College / Institution</th>
                <th className="border p-2">Leader Name</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">KLH-123456</td>
                <td className="border p-2">PSMO College Tirurangadi</td>
                <td className="border p-2">Example Name One</td>
              </tr>
              <tr>
                <td className="border p-2">KLH-654321</td>
                <td className="border p-2">
                  Majlis Arts and Science College Valanchery
                </td>
                <td className="border p-2">Example Name Two</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-gray-600">
          <li>Reg ID: KLH- and 6 digits. It must not be in the database already.</li>
          <li>Do not add team code or group columns. The system makes them.</li>
          <li>Copy college names exactly. A new spelling makes a new college.</li>
          <li>Only the first sheet is read. Maximum 500 rows.</li>
        </ul>
        <a
          className="underline"
          href={"data:text/csv;charset=utf-8," + encodeURIComponent(TEMPLATE)}
          download="teams-template.csv"
        >
          Download blank template
        </a>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.csv"
        className="block w-full text-sm"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      {pending && <p className="text-sm">Working...</p>}

      {done && (
        <p className="rounded bg-green-100 p-3 text-sm text-green-800">{done}</p>
      )}

      {preview && (
        <div className="space-y-3">
          <p
            className={`rounded p-3 text-sm ${
              preview.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {preview.message}
          </p>

          {preview.groupSizes && preview.ok && (
            <p className="text-sm">
              Group sizes after import:{" "}
              {Object.entries(preview.groupSizes)
                .map(([g, n]) => `${g}: ${n}`)
                .join(" | ")}
            </p>
          )}

          {preview.rows.length > 0 && (
            <div className="overflow-x-auto rounded border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">Line</th>
                    <th className="p-2">Code</th>
                    <th className="p-2">Group</th>
                    <th className="p-2">Reg ID</th>
                    <th className="p-2">College</th>
                    <th className="p-2">Leader</th>
                    <th className="p-2">Problems</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr
                      key={r.line}
                      className={`border-t ${r.errors.length ? "bg-red-50" : ""}`}
                    >
                      <td className="p-2">{r.line}</td>
                      <td className="p-2 font-medium">{r.teamCode ?? "-"}</td>
                      <td className="p-2">{r.group ?? "-"}</td>
                      <td className="p-2">{r.regId}</td>
                      <td className="p-2">
                        {r.college}
                        {r.newCollege && (
                          <span className="ml-2 rounded bg-yellow-200 px-1 text-xs">
                            NEW
                          </span>
                        )}
                        {r.similarTo && (
                          <div className="text-xs text-yellow-800">
                            Similar to: {r.similarTo}
                          </div>
                        )}
                      </td>
                      <td className="p-2">{r.leader}</td>
                      <td className="p-2 text-red-700">{r.errors.join(". ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={onImport}
            disabled={!preview.ok || pending}
            className="rounded bg-black px-4 py-3 text-white disabled:opacity-40"
          >
            Import {preview.ok ? preview.rows.length : ""} teams
          </button>
        </div>
      )}
    </div>
  );
}