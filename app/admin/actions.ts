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
export type HuntStatus = { is_active: boolean; updated_at: string };
export type HuntStatusResult = Res & { status?: HuntStatus };
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

export async function setHuntActive(isActive: boolean): Promise<HuntStatusResult> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  if (typeof isActive !== "boolean") {
    return { ok: false, message: "Invalid hunt status." };
  }

  const { data: status, error } = await createAdminClient()
    .from("hunt_status")
    .update({ is_active: isActive })
    .eq("id", 1)
    .select("is_active, updated_at")
    .maybeSingle();

  if (error) {
    console.error("Could not update hunt status:", error.message);
    return { ok: false, message: "Could not update hunt status. Please try again." };
  }
  if (!status) {
    return {
      ok: false,
      message: "Hunt status is not initialized. Apply the hunt status migration.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/");
  return {
    ok: true,
    message: isActive ? "Hunt started." : "Hunt stopped.",
    status,
  };
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

export async function setFinalist(id: string, isFinalist: boolean): Promise<Res> {
  if (!(await isAdmin())) return NOT_ALLOWED;

  const { error } = await createAdminClient()
    .from("teams")
    .update({ is_finalist: isFinalist })
    .eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };

  revalidatePath("/admin");
  revalidatePath("/admin/manage-teams");
  revalidatePath("/admin/qr-stats");
  revalidatePath("/");
  return { ok: true, message: isFinalist ? "Team selected for the Final Stage." : "Team removed from the Final Stage." };
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