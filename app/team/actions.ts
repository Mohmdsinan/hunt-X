"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamSession } from "@/lib/team-auth";

export interface TeamQrResult {
  ok: boolean;
  message: string;
  reason?: "invalid_qr";
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

  // Verify QR and increment scan count
  const { data, error } = await supabase.rpc("verify_qr_and_increment", {
    p_question: normalizedQuestionCode,
    p_secret: normalizedSecret,
    p_group: team.group_name,
  });

  if (error) {
    console.error("Team QR check error:", error);
    return { ok: false, message: `Database error: ${error.message}` };
  }

  // The RPC returns a JSONB object; treat a missing/false 'ok' as a mismatch.
  if (data && data.ok) {
    const { error: scanRecordError } = await supabase
      .from("team_qr_scans")
      .upsert(
        {
          team_code: session.teamCode,
          question_code: normalizedQuestionCode,
        },
        { onConflict: "team_code,question_code", ignoreDuplicates: true }
      );

    if (scanRecordError) {
      console.error("Could not record team QR scan:", scanRecordError.message);
      return {
        ok: false,
        message: "QR verified, but the leaderboard could not be updated. Please contact an organizer.",
      };
    }

    return {
      ok: true,
      message: data.message ?? "✅ QR verified! Scan recorded.",
      scanCount: data.scan_count,
      questionCode: data.question_code,
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