export const GROUPS = ["A", "B", "C", "D"] as const;
export type Group = (typeof GROUPS)[number];

// Change this if your Reg IDs look different
export const REG_ID_PATTERN = /^KLH-\d{6}$/;

export function cleanRegId(s: string) {
  return s.replace(/\s+/g, "").toUpperCase();
}

export function normalizeName(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function distance(a: string, b: string) {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

// Finds a college name that is almost the same (up to 3 letters different)
export function findSimilar(key: string, known: { name: string; key: string }[]) {
  let best: string | null = null;
  let bestDistance = 4;
  for (const k of known) {
    const d = distance(key, k.key);
    if (d < bestDistance) {
      bestDistance = d;
      best = k.name;
    }
  }
  return best;
}

type Existing = { collegeKey: string; group: Group | null };

// Rule 1: use the groups that have the fewest teams from the same college
// Rule 2: from those, use the smallest group
// Rule 3: if still equal, use the first letter
export function planGroups(existing: Existing[], incomingKeys: string[]): Group[] {
  const size: Record<Group, number> = { A: 0, B: 0, C: 0, D: 0 };
  const byCollege = new Map<string, Record<Group, number>>();

  function bucket(key: string) {
    let b = byCollege.get(key);
    if (!b) {
      b = { A: 0, B: 0, C: 0, D: 0 };
      byCollege.set(key, b);
    }
    return b;
  }

  for (const t of existing) {
    if (!t.group) continue;
    size[t.group]++;
    bucket(t.collegeKey)[t.group]++;
  }

  return incomingKeys.map((key) => {
    const b = bucket(key);
    const fewest = Math.min(...GROUPS.map((g) => b[g]));
    const candidates = GROUPS.filter((g) => b[g] === fewest);
    const smallest = Math.min(...candidates.map((g) => size[g]));
    const pick = candidates.find((g) => size[g] === smallest)!;
    size[pick]++;
    b[pick]++;
    return pick;
  });
}

export function nextCodes(existingCodes: string[], count: number) {
  let max = 0;
  for (const c of existingCodes) {
    const n = parseInt(c.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return Array.from(
    { length: count },
    (_, i) => "TH" + String(max + i + 1).padStart(2, "0")
  );
}