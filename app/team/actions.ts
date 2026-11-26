"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamSession } from "@/lib/team-auth";

export interface TeamQrResult {
  ok: boolean;
  message: string;
  reason?: "invalid_qr" | "duplicate";
  scanCount?: number;
  questionCode?: string;
}

/**
 * Normalize a team/question code: strip invisible characters and whitespace,
 * keep only letters, digits, hyphen and underscore, then upper-case.
 * The codes stored in the database are upper-case alphanumeric + hyphens,
 * so this makes scanning tolerant of case and decoder noise.
 */
function normalizeCode(value: string): string {
  return value
    .replace(/[​-‍﻿ ]/g, "") // zero-width, BOM, nbsp
    .replace(/[^A-Za-z0-9\-_]/g, "")
    .toUpperCase();
}

export async function checkTeamQr(questionCode: string, secret: string): Promise<TeamQrResult> {
  const normalizedQuestionCode = normalizeCode(questionCode);
  const normalizedSecret = normalizeCode(secret);
  if (!normalizedQuestionCode || !normalizedSecret) {
    return { ok: false, message: "Enter the question code and scan a QR code." };
  }

  // Get current team session
  const session = await getTeamSession();
  if (!session) {
    return { ok: false, message: "Not logged in. Please log in again." };
  }

  const supabase = createAdminClient();

  // First, get the team's group
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("group_name")
    .eq("team_code", session.teamCode)
    .maybeSingle();

  if (teamError) {
    console.error("Team group lookup failed:", teamError.message);
    return { ok: false, message: "Could not load team details. Please try again." };
  }

  if (!team || !team.group_name) {
    return { ok: false, message: "Team group not assigned. Contact admin." };
  }

  const { data, error } = await supabase.rpc("verify_team_qr_once", {
    p_team_id: session.teamId,
    p_question: normalizedQuestionCode,
    p_secret: normalizedSecret,
    p_group: team.group_name,
  });

  if (error) {
    console.error("Team QR check error:", error);
    return { ok: false, message: `Database error: ${error.message}` };
  }

  if (data?.reason === "duplicate") {
    return {
      ok: false,
      message: "This QR is already scanned.",
      reason: "duplicate",
    };
  }

  // The RPC returns a JSONB object; treat a missing/false 'ok' as a mismatch.
  if (data && data.ok) {
    return {
      ok: true,
      message: data.message ?? "✅ QR verified! Scan recorded.",
      scanCount: data.scan_count,
      questionCode: normalizeCode(data.question_code ?? normalizedQuestionCode),
    };
  }

  // Mismatch: report exactly what we looked up so the error is diagnosable.
  console.warn("QR mismatch", {
    question: normalizedQuestionCode,
    secret: normalizedSecret,
    group: team.group_name,
  });
  return {
    ok: false,
    message: "ഇതല്ല, വേറെ വല്ലതും നോക്ക്",
    reason: "invalid_qr",
  };
}

export async function getTeamQuestionProgress(): Promise<{
  questionCodes: string[];
  scannedQuestionCodes: string[];
} | null> {
  const session = await getTeamSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("group_name")
    .eq("id", session.teamId)
    .maybeSingle();

  if (teamError) {
    console.error("Team question progress lookup failed:", teamError.message);
    throw new Error("Could not load team details.");
  }

  if (!team) return null;

  const groupCode = team.group_name
    ?.trim()
    .replace(/^group\s+/i, "")
    .toUpperCase();
  const questionCodes = groupCode
    ? Array.from({ length: 12 }, (_, index) => `${groupCode}-${String(index + 1).padStart(2, "0")}`)
    : [];

  const { data: scans, error: scansError } = await supabase
    .from("team_qr_scans")
    .select("question_code")
    .eq("team_id", session.teamId);

  if (scansError) {
    console.error("Team scanned-question lookup failed:", scansError.message);
    throw new Error("Could not load scanned questions.");
  }

  return {
    questionCodes,
    scannedQuestionCodes: (scans ?? []).map((scan) => scan.question_code),
  };
}