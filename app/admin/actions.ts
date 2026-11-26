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
  revalidatePath("/admin/manage-teams");
  revalidatePath("/admin/groups");
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
  revalidatePath("/admin/manage-teams");
  revalidatePath("/admin/groups");
  return { ok: true, message: "Team saved." };
}


export async function deleteTeam(id: string): Promise<Res> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const { error } = await createAdminClient()
    .from("teams")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };

  revalidatePath("/admin");
  revalidatePath("/admin/manage-teams");
  revalidatePath("/admin/groups");
  return { ok: true, message: "Team deleted." };
}