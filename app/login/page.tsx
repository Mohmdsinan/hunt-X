"use client";

import { useActionState } from "react";
import { teamLogin } from "./actions";

export default function TeamLogin() {
  const [state, action, pending] = useActionState(teamLogin, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-widest text-blue-300">
            HuntX
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Team Login
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to continue your treasure hunt.
          </p>
        </div>

        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="teamCode" className="block text-sm font-medium text-zinc-200">
              Team Code
            </label>
            <input
              id="teamCode"
              type="text"
              name="teamCode"
              placeholder="Team Code"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Password"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Logging in..." : "Log in"}
          </button>
        </form>

        {state?.error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-300"
          >
            {state.error}
          </p>
        )}
      </section>
    </main>
  );
}