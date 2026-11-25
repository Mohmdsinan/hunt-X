import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Group,
  REG_ID_PATTERN,
  cleanRegId,
  findSimilar,
  nextCodes,
  normalizeName,
  planGroups,
} from "./team-planner";
import type { RawRow } from "./import-parser";

export type PlanRow = RawRow & {
  teamCode: string | null;
  group: Group | null;
  collegeKey: string;
  collegeName: string;
  newCollege: boolean;
  similarTo: string | null;
  errors: string[];
};

export type Plan = {
  rows: PlanRow[];
  hasErrors: boolean;
  collegeIds: Map<string, number>;
  groupSizes: Record<Group, number>;
};

export async function buildPlan(db: SupabaseClient, raw: RawRow[]): Promise<Plan> {
  const [teamsRes, collegesRes] = await Promise.all([
    db.from("teams").select("reg_id, team_code, group_name, college_id"),
    db.from("colleges").select("id, name"),
  ]);
  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (collegesRes.error) throw new Error(collegesRes.error.message);
  const teams = teamsRes.data ?? [];
  const colleges = collegesRes.data ?? [];

  const nameById = new Map<number, string>(colleges.map((c) => [c.id, c.name]));
  const collegeIds = new Map<string, number>();
  const known: { name: string; key: string }[] = [];
  for (const c of colleges) {
    const key = normalizeName(c.name);
    collegeIds.set(key, c.id);
    known.push({ name: c.name, key });
  }

  const existingRegIds = new Set<string>(
    teams.map((t) => String(t.reg_id).toUpperCase())
  );
  const seenInFile = new Map<string, number>();

  const rows: PlanRow[] = raw.map((r) => {
    const errors: string[] = [];
    const regId = cleanRegId(r.regId);
    const leader = r.leader.replace(/\s+/g, " ").trim();
    const collegeText = r.college.replace(/\s+/g, " ").trim();

    if (!REG_ID_PATTERN.test(regId)) {
      errors.push("Reg ID must look like KLH-123456");
    } else if (existingRegIds.has(regId)) {
      errors.push("Reg ID already exists in the database");
    } else if (seenInFile.has(regId)) {
      errors.push(`Reg ID repeated (first on line ${seenInFile.get(regId)})`);
    } else {
      seenInFile.set(regId, r.line);
    }

    if (!collegeText) errors.push("College is missing");
    if (!leader) errors.push("Leader name is missing");
    if (leader.length > 100 || collegeText.length > 150) errors.push("Text is too long");

    const key = normalizeName(collegeText);
    let collegeName = collegeText;
    let newCollege = false;
    let similarTo: string | null = null;

    if (collegeText) {
      const match = known.find((k) => k.key === key);
      if (match) {
        collegeName = match.name;
        newCollege = !collegeIds.has(key); // true when it is new in this file
      } else {
        newCollege = true;
        similarTo = findSimilar(key, known);
        known.push({ name: collegeText, key });
      }
    }

    return {
      line: r.line,
      regId,
      college: collegeText,
      leader,
      teamCode: null,
      group: null,
      collegeKey: key,
      collegeName,
      newCollege,
      similarTo,
      errors,
    };
  });

  // Plan codes and groups for the good rows
  const valid = rows.filter((r) => r.errors.length === 0);
  const groups = planGroups(
    teams.map((t) => ({
      collegeKey: normalizeName(nameById.get(t.college_id) ?? ""),
      group: (t.group_name ?? null) as Group | null,
    })),
    valid.map((r) => r.collegeKey)
  );
  const codes = nextCodes(
    teams.map((t) => String(t.team_code)),
    valid.length
  );
  valid.forEach((r, i) => {
    r.group = groups[i];
    r.teamCode = codes[i];
  });

  // Group sizes after the import
  const groupSizes: Record<Group, number> = { A: 0, B: 0, C: 0, D: 0 };
  teams.forEach((t) => {
    if (t.group_name && t.group_name in groupSizes) groupSizes[t.group_name as Group]++;
  });
  valid.forEach((r) => groupSizes[r.group!]++);

  return {
    rows,
    hasErrors: rows.some((r) => r.errors.length > 0),
    collegeIds,
    groupSizes,
  };
}

export async function savePlan(
  db: SupabaseClient,
  plan: Plan
): Promise<{ ok: boolean; message: string }> {
  if (plan.hasErrors) return { ok: false, message: "Fix the errors first." };
  if (plan.rows.length === 0) return { ok: false, message: "No teams to add." };

  // 1. Make the new colleges
  const ids = new Map(plan.collegeIds);
  const toCreate = new Map<string, string>();
  for (const r of plan.rows) {
    if (!ids.has(r.collegeKey) && !toCreate.has(r.collegeKey)) {
      toCreate.set(r.collegeKey, r.collegeName);
    }
  }
  if (toCreate.size > 0) {
    const { data, error } = await db
      .from("colleges")
      .insert(Array.from(toCreate.values(), (name) => ({ name })))
      .select("id, name");
    if (error) return { ok: false, message: error.message };
    for (const c of data ?? []) ids.set(normalizeName(c.name), c.id);
  }

  // 2. Add all teams in one step (all saved, or none saved)
  const { error } = await db.from("teams").insert(
    plan.rows.map((r) => ({
      team_code: r.teamCode,
      reg_id: r.regId,
      leader_name: r.leader,
      college_id: ids.get(r.collegeKey),
      group_name: r.group,
    }))
  );
  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "A Reg ID or team code was just added by someone else. Please try again."
          : error.message,
    };
  }

  return {
    ok: true,
    message:
      plan.rows.length === 1
        ? "1 team added."
        : `${plan.rows.length} teams added.`,
  };
}