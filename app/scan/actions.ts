"use server";

import { createClient } from "@/lib/supabase/server";

export async function checkQr(question: string, secret: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_qr", {
    p_question: question,
    p_secret: secret,
  });

  if (error) {
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  return data
    ? { ok: true, message: "✅ Match found!" }
    : { ok: false, message: "❌ Not found. Check the question code and try again." };
}