import ExcelJS from "exceljs";
import Papa from "papaparse";

export type Line = { line: number; cells: string[] };
export type RawRow = { line: number; regId: string; college: string; leader: string };

const HEADERS = {
  regId: ["regid", "registrationid"],
  college: ["collegeinstitution", "college", "institution"],
  leader: ["leadername", "leader"],
};

const simple = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as any;
    if (Array.isArray(o.richText)) {
      return o.richText.map((t: any) => t.text).join("").trim();
    }
    if (o.text != null) return cellText(o.text);
    if (o.result != null) return cellText(o.result);
  }
  return "";
}

export async function readSheet(file: File): Promise<Line[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".csv")) {
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
    return parsed.data.map((cells, i) => ({
      line: i + 1,
      cells: cells.map((c) => String(c ?? "").trim()),
    }));
  }

  if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("The file has no sheet.");
    const lines: Line[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = (row.values as unknown[]).slice(1); // exceljs starts at index 1
      lines.push({ line: rowNumber, cells: Array.from(values, (v) => cellText(v)) });
    });
    return lines;
  }

  throw new Error("Use a .xlsx or .csv file.");
}

export function parseRows(lines: Line[]): { rows: RawRow[]; error?: string } {
  const filled = lines.filter((l) => l.cells.some((c) => c !== ""));
  if (filled.length === 0) return { rows: [], error: "The file is empty." };

  const header = filled[0].cells.map(simple);
  const find = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iReg = find(HEADERS.regId);
  const iCollege = find(HEADERS.college);
  const iLeader = find(HEADERS.leader);

  if (iReg < 0 || iCollege < 0 || iLeader < 0) {
    return {
      rows: [],
      error:
        'The first row must be the header: "Reg ID", "College / Institution", "Leader Name".',
    };
  }

  const rows: RawRow[] = filled.slice(1).map((l) => ({
    line: l.line,
    regId: l.cells[iReg] ?? "",
    college: l.cells[iCollege] ?? "",
    leader: l.cells[iLeader] ?? "",
  }));
  return { rows };
}