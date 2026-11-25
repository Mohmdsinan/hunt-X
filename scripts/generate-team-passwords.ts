/**
 * Utility to generate team passwords in the format: team_code + 4 random chars
 * Run this after adding the password column to generate passwords for existing teams
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

function generateRandomChars(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generatePasswords() {
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, team_code, password")
    .is("password", null);

  if (error) {
    console.error("Error fetching teams:", error);
    return;
  }

  if (!teams || teams.length === 0) {
    console.log("No teams need password generation");
    return;
  }

  console.log(`Generating passwords for ${teams.length} teams...`);

  for (const team of teams) {
    const password = team.team_code + generateRandomChars(4);
    const { error: updateError } = await supabase
      .from("teams")
      .update({ password })
      .eq("id", team.id);

    if (updateError) {
      console.error(`Error updating team ${team.team_code}:`, updateError);
    } else {
      console.log(`Team ${team.team_code}: ${password}`);
    }
  }

  console.log("Done!");
}

generatePasswords();