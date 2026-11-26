import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamSession } from "@/lib/team-auth";
import { TeamHeaderClient } from "./TeamHeaderClient";

export async function TeamHeaderWrapper() {
  await connection();
  const session = await getTeamSession();
  if (!session) return <TeamHeaderClient initialSession={null} />;

  const { data: team, error } = await createAdminClient()
    .from("teams")
    .select("id, team_code, group_name")
    .eq("id", session.teamId)
    .maybeSingle();

  if (error) {
    console.error("Could not load team for active header session:", {
      teamId: session.teamId,
      code: error.code,
      message: error.message,
    });
    return <TeamHeaderClient initialSession={session} />;
  }

  if (!team) {
    console.error("Active team header session has no matching team record:", {
      teamId: session.teamId,
      teamCode: session.teamCode,
    });
    return <TeamHeaderClient initialSession={session} />;
  }

  return (
    <TeamHeaderClient
      initialSession={{
        teamId: team.id,
        teamCode: String(team.team_code).trim().toUpperCase(),
        groupName: team.group_name,
      }}
    />
  );
}