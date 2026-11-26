"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin-auth";

export type DisqualifyActionResult = {
  ok: boolean;
  message: string;
};

const NOT_ALLOWED: DisqualifyActionResult = {
  ok: false,
  message: "Not allowed. Please log in again.",
};

function refreshDisqualificationViews() {
  revalidatePath("/admin/disqualify");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/team");
}

export async function disqualifyTeam(
  teamCodeInput: string,
  reasonInput: string
): Promise<DisqualifyActionResult> {
  if (!(await isAdmin())) return NOT_ALLOWED;

  const teamCode = teamCodeInput.trim().toUpperCase();
  const reason = reasonInput.trim();
  if (!teamCode) return { ok: false, message: "Enter a team code." };
  if (reason.length > 500) {
    return { ok: false, message: "Reason must be 500 characters or fewer." };
  }

  const db = createAdminClient();
  const { data: team, error: lookupError } = await db
    .from("teams")
    .select("id, is_disqualified")
    .eq("team_code", teamCode)
    .maybeSingle();

  if (lookupError) {
    console.error("Could not look up team for disqualification:", lookupError.message);
    return { ok: false, message: "Could not look up that team. Please try again." };
  }
  if (!team) return { ok: false, message: "Team code not found" };
  if (team.is_disqualified) {
    return { ok: false, message: "This team is already disqualified" };
  }

  const { data: updatedTeam, error: updateError } = await db
    .from("teams")
    .update({
      is_disqualified: true,
      disqualification_reason: reason || null,
    })
    .eq("id", team.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Could not disqualify team:", updateError.message);
    return { ok: false, message: "Could not disqualify that team. Please try again." };
  }
  if (!updatedTeam) return { ok: false, message: "Team code not found" };

  refreshDisqualificationViews();
  return { ok: true, message: `${teamCode} has been disqualified.` };
}

export async function reinstateTeam(teamId: string): Promise<DisqualifyActionResult> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  if (!teamId.trim()) return { ok: false, message: "Team not found." };

  const { data: updatedTeam, error } = await createAdminClient()
    .from("teams")
    .update({ is_disqualified: false, disqualification_reason: null })
    .eq("id", teamId)
    .eq("is_disqualified", true)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not reinstate team:", error.message);
    return { ok: false, message: "Could not reinstate that team. Please try again." };
  }
  if (!updatedTeam) {
    return { ok: false, message: "Team is no longer disqualified or could not be found." };
  }

  refreshDisqualificationViews();
  return { ok: true, message: "Team reinstated." };
}
