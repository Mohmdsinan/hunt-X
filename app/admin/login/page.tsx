"use client";

import { useActionState } from "react";
import { useState } from "react";
import Link from "next/link";
import { login } from "../actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, undefined);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-md">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <span className="mb-4 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-300">
              HuntX • Organizer Portal
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
              Admin Login
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Sign in to manage the HuntX event.
            </p>
          </div>

          <form action={action} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="admin-password" className="block text-sm font-medium text-zinc-200">
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  placeholder="Enter admin password"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 pr-12 text-white placeholder-zinc-500 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500 transition hover:text-zinc-200 focus:outline-none focus-visible:text-white"
                >
                  {passwordVisible ? (
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.5 4.5 9.5 6.2a1.5 1.5 0 010 1.6 15.8 15.8 0 01-3.1 3.6M6.2 6.2a16.2 16.2 0 00-3.7 5 1.5 1.5 0 000 1.6C3.5 14.5 6.8 19 12 19c1 0 1.9-.2 2.8-.5" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Checking..." : "Log in"}
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

        <div className="mt-5 text-center">
          <Link href="/" className="text-sm text-zinc-500 transition hover:text-zinc-300">
            ← Back to Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}