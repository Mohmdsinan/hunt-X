import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "team_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(value: string) {
  return createHmac("sha256", process.env.TEAM_SESSION_SECRET!)
    .update(value)
    .digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ha = createHmac("sha256", "compare").update(a).digest();
  const hb = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export interface TeamSession {
  teamId: string;
  teamCode: string;
  groupName?: string | null;
}

function normalizeTeamCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeGroupName(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim().replace(/^group\s+/i, "").toUpperCase() || null;
}

function parseTeamSession(payload: string): TeamSession | null {
  try {
    const json = payload.startsWith("{")
      ? payload
      : Buffer.from(payload, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return null;

    const data = parsed as Record<string, unknown>;
    const teamId = data.id ?? data.teamId;
    const teamCode = data.team_code ?? data.teamCode;
    const groupName = data.group ?? data.groupName;
    if (typeof teamId !== "string" || typeof teamCode !== "string") return null;

    return {
      teamId,
      teamCode: normalizeTeamCode(teamCode),
      groupName: typeof groupName === "string" ? normalizeGroupName(groupName) : null,
    };
  } catch {
    return null;
  }
}

export async function createTeamSession(team: TeamSession) {
  const exp = Date.now() + MAX_AGE * 1000;
  const teamData = Buffer.from(
    JSON.stringify({
      id: team.teamId,
      team_code: normalizeTeamCode(team.teamCode),
      group: normalizeGroupName(team.groupName),
    })
  ).toString("base64url");
  const signedValue = `${teamData}.${exp}`;
  const value = `${signedValue}.${sign(signedValue)}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroyTeamSession() {
  (await cookies()).delete(COOKIE);
}

export async function getTeamSession(): Promise<TeamSession | null> {
  if (!process.env.TEAM_SESSION_SECRET) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;

  const parts = value.match(/^(.+)\.(\d+)\.([a-f0-9]{64})$/);
  if (!parts) return null;
  const [, teamData, exp, sig] = parts;

  if (!teamData || Number(exp) < Date.now()) return null;

  const expectedSig = sign(`${teamData}.${exp}`);
  if (!safeEqual(sig, expectedSig)) return null;

  return parseTeamSession(teamData);
}

export async function isTeamLoggedIn(): Promise<boolean> {
  const session = await getTeamSession();
  return session !== null;
}