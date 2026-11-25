"use client";

import { useActionState } from "react";
import { teamLogin } from "./actions";

export default function TeamLogin() {
  const [state, action, pending] = useActionState(teamLogin, undefined);

  return (
    <main className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-bold">Team Login</h1>
      <form action={action} className="space-y-3">
        <input
          type="text"
          name="teamCode"
          placeholder="Team Code (e.g., TH01)"
          className="w-full rounded border p-3"
          autoFocus
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="w-full rounded border p-3"
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
        >
          {pending ? "Logging in..." : "Log in"}
        </button>
      </form>
      {state?.error && <p className="text-center text-red-600">{state.error}</p>}
      <p className="text-center text-sm text-gray-500">
        Password format: Team Code + 4 characters (e.g., TH01abcd)
      </p>
    </main>
  );
}