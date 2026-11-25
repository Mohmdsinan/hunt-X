"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin-auth";
import { buildPlan, savePlan } from "@/lib/team-import";
import { parseRows, readSheet, type RawRow } from "@/lib/import-parser";
import { GROUPS, type Group } from "@/lib/team-planner";

type Res = { ok: boolean; message: string };
const NOT_ALLOWED: Res = { ok: false, message: "Not allowed. Please log in again." };

export type PreviewRow = {
  line: number;
  regId: string;
  college: string;
  leader: string;
  teamCode: string | null;
  group: string | null;
  newCollege: boolean;
  similarTo: string | null;
  errors: string[];
};

export type PreviewResult = {
  ok: boolean;
  message: string;
  rows: PreviewRow[];
  groupSizes: Record<string, number> | null;
};

async function rowsFromForm(
  formData: FormData
): Promise<{ rows?: RawRow[]; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }
  if (file.size > 900_000) return { error: "The file is too big (max 900 KB)." };

  try {
    const parsed = parseRows(await readSheet(file));
    if (parsed.error) return { error: parsed.error };
    if (parsed.rows.length === 0) return { error: "No teams found in the file." };
    if (parsed.rows.length > 500) return { error: "Too many rows (max 500)." };
    return { rows: parsed.rows };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not read the file.",
    };
  }
}

export async function previewImport(formData: FormData): Promise<PreviewResult> {
  const none = { rows: [], groupSizes: null };
  if (!(await isAdmin())) return { ...NOT_ALLOWED, ...none };

  const parsed = await rowsFromForm(formData);
  if (!parsed.rows) return { ok: false, message: parsed.error!, ...none };

  try {
    const plan = await buildPlan(createAdminClient(), parsed.rows);
    return {
      ok: !plan.hasErrors,
      message: plan.hasErrors
        ? "Some rows have errors. Fix the file and upload it again."
        : "Check the preview, then press Import.",
      rows: plan.rows.map((r) => ({
        line: r.line,
        regId: r.regId,
        college: r.collegeName,
        leader: r.leader,
        teamCode: r.teamCode,
        group: r.group,
        newCollege: r.newCollege,
        similarTo: r.similarTo,
        errors: r.errors,
      })),
      groupSizes: plan.groupSizes,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Something went wrong.",
      ...none,
    };
  }
}

export async function commitImport(formData: FormData): Promise<Res> {
  if (!(await isAdmin())) return NOT_ALLOWED;

  // The file is read again on the server, so nothing from the browser is trusted
  const parsed = await rowsFromForm(formData);
  if (!parsed.rows) return { ok: false, message: parsed.error! };

  try {
    const db = createAdminClient();
    const plan = await buildPlan(db, parsed.rows);
    const res = await savePlan(db, plan);
    if (res.ok) revalidatePath("/admin");
    return res;
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

export async function addTeam(input: {
  reg_id: string;
  leader_name: string;
  college_id: number | null;
  new_college: string;
  group_name: string | null;
}): Promise<Res> {
  if (!(await isAdmin())) return NOT_ALLOWED;

  if (input.group_name && !(GROUPS as readonly string[]).includes(input.group_name)) {
    return { ok: false, message: "Group must be A, B, C or D." };
  }

  try {
    const db = createAdminClient();

    let college = input.new_college.trim();
    if (!college && input.college_id) {
      const { data } = await db
        .from("colleges")
        .select("name")
        .eq("id", input.college_id)
        .maybeSingle();
      college = data?.name ?? "";
    }

    const plan = await buildPlan(db, [
      { line: 1, regId: input.reg_id, college, leader: input.leader_name },
    ]);
    const row = plan.rows[0];
    if (row.errors.length > 0) return { ok: false, message: row.errors.join(". ") + "." };

    // A group chosen by hand wins over the automatic group
    if (input.group_name) row.group = input.group_name as Group;

    const res = await savePlan(db, plan);
    if (!res.ok) return res;

    revalidatePath("/admin");
    let message = `Team added: ${row.teamCode}, group ${row.group}.`;
    if (row.similarTo) {
      message += ` Check the college name: it is similar to "${row.similarTo}".`;
    }
    return { ok: true, message };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}