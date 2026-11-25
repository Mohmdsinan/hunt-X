import { connection } from "next/server";
import { getTeamSession } from "@/lib/team-auth";
import { TeamHeaderClient } from "./TeamHeaderClient";

export async function TeamHeaderWrapper() {
  await connection();
  const session = await getTeamSession();

  return <TeamHeaderClient initialSession={session} />;
}