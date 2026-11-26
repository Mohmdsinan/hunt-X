"use client";

export type GroupCsvRow = {
  group: string;
  teamCode: string;
  collegeName: string;
  leaderName: string;
};

export default function DownloadButton({
  rows,
  filename,
  label,
}: {
  rows: GroupCsvRow[];
  filename: string;
  label: string;
}) {
  function downloadCsv() {
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [
      ["Group", "Team Code", "College Name", "Leader Name"],
      ...rows.map((row) => [
        row.group,
        row.teamCode,
        row.collegeName,
        row.leaderName,
      ]),
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <button
      type="button"
      onClick={downloadCsv}
      disabled={rows.length === 0}
      className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
