/**
 * Debug script to check login/session flow
 * Run with: npx tsx scripts/debug-login.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLogin(teamCode: string, password: string) {
  console.log('=== DEBUG LOGIN ===');
  console.log('Team code:', teamCode, 'Password:', password);

  // Find team in database
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, team_code, group_name, password, leader_name')
    .eq('team_code', teamCode.trim().toUpperCase())
    .single();

  console.log('Database team:', team ? { id: team.id, code: team.team_code, group: team.group_name, password: team.password ? '***' : null } : null);

  if (!team) {
    console.log('❌ Team not found');
    return;
  }

  // Test password
  if (team.password !== password) {
    console.log('❌ Password mismatch');
    return;
  }

  console.log('✅ Password correct');

  // Simulate session creation
  const sessionData = {
    teamId: team.id,
    teamCode: team.team_code,
    leaderName: team.leader_name,
  };

  console.log('Session would contain:', sessionData);

  // Test QR verification
  const { data: qr, error: qrError } = await supabase.rpc('verify_qr_and_increment', {
    p_question: teamCode,
    p_secret: password,
    p_group: team.group_name,
  });

  console.log('QR verification:', qr);

  if (qr?.ok) {
    console.log('✅ QR works! Scan count:', qr.scan_count);
  } else {
    console.log('❌ QR failed:', qr?.message);
  }
}

// Test with a real team
const testTeam = 'TH01';
const testPassword = 'TH010000';

debugLogin(testTeam, testPassword).catch(console.error);
