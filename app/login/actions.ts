"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeamSession, destroyTeamSession } from "@/lib/team-auth";

type Res = { error?: string };

export async function teamLogin(_prev: Res | undefined, formData: FormData): Promise<Res> {
  const teamCode = String(formData.get("teamCode") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!teamCode || !password) {
    return { error: "Team code and password are required" };
  }

  const supabase = createAdminClient();

  // Find team by team_code
  const { data: team, error } = await supabase
    .from("teams")
    .select("id, team_code, reg_id, leader_name, college_id, group_name, password")
    .eq("team_code", teamCode)
    .single();

  if (error) {
    console.error("Team login lookup failed:", error.message);
    return { error: "Unable to verify login right now. Please try again." };
  }

  if (!team) {
    return { error: "Invalid team code or password" };
  }

  // Check password (plain text comparison as per requirements)
  if (team.password !== password) {
    return { error: "Invalid team code or password" };
  }

  // Create session
  await createTeamSession({
    teamId: team.id,
    teamCode: team.team_code,
    leaderName: team.leader_name,
    groupName: team.group_name,
  });

  revalidatePath("/");
  redirect("/");
}

export async function teamLogout() {
  await destroyTeamSession();
  redirect("/");
}