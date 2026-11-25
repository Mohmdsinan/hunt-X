"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSession,
  destroySession,
  isAdmin,
  safeEqual,
} from "@/lib/admin-auth";

type Res = { ok: boolean; message: string };
const GROUPS = ["A", "B", "C", "D"];
const NOT_ALLOWED: Res = { ok: false, message: "Not allowed. Please log in again." };

function parseGroup(g: string | null | undefined): string | null | "bad" {
  if (!g) return null;
  return GROUPS.includes(g) ? g : "bad";
}

function dbMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "This Reg ID or team code already exists.";
  return error.message;
}

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const password = String(formData.get("password") ?? "");
  const real = process.env.ADMIN_PASSWORD;
  if (!real || !process.env.ADMIN_SESSION_SECRET) {
    return { error: "Admin is not set up on the server." };
  }
  if (!safeEqual(password, real)) {
    return { error: "Wrong password." };
  }
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

export async function setGroup(id: string, group: string | null): Promise<Res> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const g = parseGroup(group);
  if (g === "bad") return { ok: false, message: "Group must be A, B, C or D." };

  const { error } = await createAdminClient()
    .from("teams")
    .update({ group_name: g })
    .eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };

  revalidatePath("/admin");
  return { ok: true, message: "Group updated." };
}

export async function updateTeam(
  id: string,
  input: {
    reg_id: string;
    leader_name: string;
    college_id: number;
    group_name: string | null;
  }
): Promise<Res> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const reg_id = input.reg_id.trim();
  const leader_name = input.leader_name.trim();
  if (!reg_id || !leader_name) {
    return { ok: false, message: "Reg ID and leader name are required." };
  }
  const g = parseGroup(input.group_name);
  if (g === "bad") return { ok: false, message: "Group must be A, B, C or D." };

  const { error } = await createAdminClient()
    .from("teams")
    .update({
      reg_id,
      leader_name,
      college_id: input.college_id,
      group_name: g,
    })
    .eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };

  revalidatePath("/admin");
  return { ok: true, message: "Team saved." };
}

export async function addTeam(input: {
  reg_id: string;
  leader_name: string;
  college_id: number | null;
  new_college: string;
  group_name: string | null;
}): Promise<Res> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const reg_id = input.reg_id.trim();
  const leader_name = input.leader_name.trim();
  const newCollege = input.new_college.trim();
  if (!reg_id || !leader_name) {
    return { ok: false, message: "Reg ID and leader name are required." };
  }
  const g = parseGroup(input.group_name);
  if (g === "bad") return { ok: false, message: "Group must be A, B, C or D." };

  const db = createAdminClient();

  // Find or make the college
  let collegeId = input.college_id;
  if (newCollege) {
    const found = await db
      .from("colleges")
      .select("id")
      .eq("name", newCollege)
      .maybeSingle();
    if (found.data) {
      collegeId = found.data.id;
    } else {
      const made = await db
        .from("colleges")
        .insert({ name: newCollege })
        .select("id")
        .single();
      if (made.error) return { ok: false, message: dbMessage(made.error) };
      collegeId = made.data.id;
    }
  }
  if (!collegeId) return { ok: false, message: "Choose a college." };

  // Make the next team code (TH26, TH27, ...)
  const codes = await db.from("teams").select("team_code");
  if (codes.error) return { ok: false, message: dbMessage(codes.error) };
  let max = 0;
  for (const row of codes.data ?? []) {
    const n = parseInt(row.team_code.replace(/\D/g, ""), 10);
    if (n > max) max = n;
  }
  const team_code = "TH" + String(max + 1).padStart(2, "0");

  const { error } = await db.from("teams").insert({
    team_code,
    reg_id,
    leader_name,
    college_id: collegeId,
    group_name: g,
  });
  if (error) return { ok: false, message: dbMessage(error) };

  revalidatePath("/admin");
  return { ok: true, message: `Team added with code ${team_code}.` };
}

export async function deleteTeam(id: string): Promise<Res> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const { error } = await createAdminClient()
    .from("teams")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };

  revalidatePath("/admin");
  return { ok: true, message: "Team deleted." };
}