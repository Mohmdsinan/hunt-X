"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeamSession, destroyTeamSession } from "@/lib/team-auth";

type TeamLoginResult = {
  error?: string;
  disqualified?: boolean;
  disqualificationReason?: string | null;
};

export async function teamLogin(
  _prev: TeamLoginResult | undefined,
  formData: FormData
): Promise<TeamLoginResult> {
  const teamCode = String(formData.get("teamCode") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!teamCode || !password) {
    return { error: "Team code and password are required" };
  }

  const supabase = createAdminClient();

  // Find team by team_code
  const { data: team, error } = await supabase
    .from("teams")
    .select(
      "id, team_code, reg_id, leader_name, college_id, group_name, password, is_disqualified, disqualification_reason"
    )
    .eq("team_code", teamCode)
    .maybeSingle();

  if (error) {
    console.error("Team login lookup failed:", error.message);
    return { error: "Unable to verify login right now. Please try again." };
  }

  if (!team) return { error: "Invalid team code or password" };

  // Check password (plain text comparison as per requirements)
  if (team.password !== password) {
    return { error: "Invalid team code or password" };
  }

  if (team.is_disqualified) {
    return {
      error: "You are disqualified",
      disqualified: true,
      disqualificationReason: team.disqualification_reason,
    };
  }

  // Create session
  await createTeamSession({
    teamId: team.id,
    teamCode: String(team.team_code).trim().toUpperCase(),
    groupName: team.group_name,
  });

  revalidatePath("/");
  redirect("/");
}

export async function teamLogout() {
  await destroyTeamSession();
  redirect("/");
}