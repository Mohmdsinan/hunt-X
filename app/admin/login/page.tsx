"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-bold">Admin login</h1>
      <form action={action} className="space-y-3">
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="w-full rounded border p-3"
          autoFocus
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
        >
          {pending ? "Checking..." : "Log in"}
        </button>
      </form>
      {state?.error && <p className="text-center text-red-600">{state.error}</p>}
    </main>
  );
}