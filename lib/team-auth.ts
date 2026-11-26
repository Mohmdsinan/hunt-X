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
  leaderName: string;
  groupName?: string | null;
}

export async function createTeamSession(team: TeamSession) {
  const exp = Date.now() + MAX_AGE * 1000;
  const value = `${JSON.stringify(team)}.${exp}.${sign(`${JSON.stringify(team)}.${exp}`)}`;
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

  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [teamData, exp, sig] = parts;
  if (!teamData || !exp || !sig) return null;

  if (Number(exp) < Date.now()) return null;

  const expectedSig = sign(`${teamData}.${exp}`);
  if (!safeEqual(sig, expectedSig)) return null;

  try {
    return JSON.parse(teamData);
  } catch {
    return null;
  }
}

export async function isTeamLoggedIn(): Promise<boolean> {
  const session = await getTeamSession();
  return session !== null;
}