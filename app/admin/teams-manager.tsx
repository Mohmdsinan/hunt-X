"use client";

import { useMemo, useState, useTransition } from "react";
import { addTeam, deleteTeam, setGroup, updateTeam } from "./actions";

type Team = {
  id: string;
  team_code: string;
  reg_id: string;
  leader_name: string;
  group_name: string | null;
  college_id: number;
};
type College = { id: number; name: string };

const GROUPS = ["A", "B", "C", "D"];

export default function TeamsManager({
  teams,
  colleges,
}: {
  teams: Team[];
  colleges: College[];
}) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    reg_id: "",
    leader_name: "",
    college_id: 0,
    group_name: "",
  });
  const [showAdd, setShowAdd] = useState(false);
  const [add, setAdd] = useState({
    reg_id: "",
    leader_name: "",
    college_id: "",
    new_college: "",
    group_name: "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const collegeName = useMemo(
    () => new Map(colleges.map((c) => [c.id, c.name])),
    [colleges]
  );

  // Teams from the same college in the same group (only if the college has 4 teams or fewer)
  const conflicts = useMemo(() => {
    const perCollege = new Map<number, number>();
    const perCollegeGroup = new Map<string, number>();
    teams.forEach((t) => {
      perCollege.set(t.college_id, (perCollege.get(t.college_id) ?? 0) + 1);
      if (t.group_name) {
        const k = `${t.college_id}-${t.group_name}`;
        perCollegeGroup.set(k, (perCollegeGroup.get(k) ?? 0) + 1);
      }
    });
    const set = new Set<string>();
    teams.forEach((t) => {
      if (!t.group_name) return;
      const same = perCollegeGroup.get(`${t.college_id}-${t.group_name}`) ?? 0;
      if ((perCollege.get(t.college_id) ?? 0) <= 4 && same > 1) set.add(t.id);
    });
    return set;
  }, [teams]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, NONE: 0 };
    teams.forEach((t) => {
      c[t.group_name ?? "NONE"]++;
    });
    return c;
  }, [teams]);

  const filtered = teams.filter((t) => {
    if (filter === "NONE" && t.group_name) return false;
    if (GROUPS.includes(filter) && t.group_name !== filter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      t.team_code,
      t.reg_id,
      t.leader_name,
      collegeName.get(t.college_id) ?? "",
    ].some((v) => v.toLowerCase().includes(q));
  });

  function run(
    fn: () => Promise<{ ok: boolean; message: string }>,
    after?: () => void
  ) {
    startTransition(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) after?.();
    });
  }

  function startEdit(t: Team) {
    setEditId(t.id);
    setDraft({
      reg_id: t.reg_id,
      leader_name: t.leader_name,
      college_id: t.college_id,
      group_name: t.group_name ?? "",
    });
  }

  return (
    <div className="space-y-4">
      {/* Group cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <button
          onClick={() => setFilter("ALL")}
          className={`rounded border p-3 text-left ${filter === "ALL" ? "bg-black text-white" : ""}`}
        >
          <div className="text-sm">All</div>
          <div className="text-xl font-bold">{teams.length}</div>
        </button>
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`rounded border p-3 text-left ${filter === g ? "bg-black text-white" : ""}`}
          >
            <div className="text-sm">Group {g}</div>
            <div className="text-xl font-bold">{counts[g]}</div>
          </button>
        ))}
        <button
          onClick={() => setFilter("NONE")}
          className={`rounded border p-3 text-left ${filter === "NONE" ? "bg-black text-white" : ""}`}
        >
          <div className="text-sm">No group</div>
          <div className="text-xl font-bold">{counts.NONE}</div>
        </button>
      </div>

      {conflicts.size > 0 && (
        <p className="rounded bg-yellow-100 p-3 text-sm text-yellow-900">
          Warning: {conflicts.size} teams share a group with a team from the same
          college. They are marked in red below.
        </p>
      )}

      {msg && (
        <p
          className={`rounded p-3 text-sm ${msg.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {msg.text}
        </p>
      )}

      {/* Search and add */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="w-full rounded border p-3"
          placeholder="Search by code, reg ID, name or college"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded bg-black px-4 py-3 text-white"
        >
          {showAdd ? "Close" : "Add team"}
        </button>
      </div>

      {showAdd && (
        <div className="grid gap-2 rounded border p-3 sm:grid-cols-2">
          <input
            className="rounded border p-2"
            placeholder="Reg ID (KLH-...)"
            value={add.reg_id}
            onChange={(e) => setAdd({ ...add, reg_id: e.target.value })}
          />
          <input
            className="rounded border p-2"
            placeholder="Leader name"
            value={add.leader_name}
            onChange={(e) => setAdd({ ...add, leader_name: e.target.value })}
          />
          <select
            className="rounded border p-2"
            value={add.college_id}
            onChange={(e) => setAdd({ ...add, college_id: e.target.value })}
          >
            <option value="">Choose college</option>
            <option value="new">+ New college</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="rounded border p-2"
            value={add.group_name}
            onChange={(e) => setAdd({ ...add, group_name: e.target.value })}
          >
            <option value="">No group</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                Group {g}
              </option>
            ))}
          </select>
          {add.college_id === "new" && (
            <input
              className="rounded border p-2 sm:col-span-2"
              placeholder="New college name"
              value={add.new_college}
              onChange={(e) => setAdd({ ...add, new_college: e.target.value })}
            />
          )}
          <button
            disabled={pending}
            className="rounded bg-black p-2 text-white disabled:opacity-50 sm:col-span-2"
            onClick={() =>
              run(
                () =>
                  addTeam({
                    reg_id: add.reg_id,
                    leader_name: add.leader_name,
                    college_id:
                      add.college_id && add.college_id !== "new"
                        ? Number(add.college_id)
                        : null,
                    new_college: add.college_id === "new" ? add.new_college : "",
                    group_name: add.group_name || null,
                  }),
                () => {
                  setAdd({
                    reg_id: "",
                    leader_name: "",
                    college_id: "",
                    new_college: "",
                    group_name: "",
                  });
                  setShowAdd(false);
                }
              )
            }
          >
            Save new team
          </button>
        </div>
      )}

      {/* Teams table */}
      <div className="overflow-x-auto rounded border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2">Code</th>
              <th className="p-2">Reg ID</th>
              <th className="p-2">College</th>
              <th className="p-2">Leader</th>
              <th className="p-2">Group</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const editing = editId === t.id;
              return (
                <tr
                  key={t.id}
                  className={`border-t ${conflicts.has(t.id) ? "bg-red-50" : ""}`}
                >
                  <td className="p-2 font-medium">{t.team_code}</td>

                  <td className="p-2">
                    {editing ? (
                      <input
                        className="w-32 rounded border p-1"
                        value={draft.reg_id}
                        onChange={(e) =>
                          setDraft({ ...draft, reg_id: e.target.value })
                        }
                      />
                    ) : (
                      t.reg_id
                    )}
                  </td>

                  <td className="p-2">
                    {editing ? (
                      <select
                        className="w-56 rounded border p-1"
                        value={draft.college_id}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            college_id: Number(e.target.value),
                          })
                        }
                      >
                        {colleges.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      collegeName.get(t.college_id)
                    )}
                  </td>

                  <td className="p-2">
                    {editing ? (
                      <input
                        className="w-40 rounded border p-1"
                        value={draft.leader_name}
                        onChange={(e) =>
                          setDraft({ ...draft, leader_name: e.target.value })
                        }
                      />
                    ) : (
                      t.leader_name
                    )}
                  </td>

                  <td className="p-2">
                    <select
                      className="rounded border p-1"
                      disabled={pending}
                      value={editing ? draft.group_name : (t.group_name ?? "")}
                      onChange={(e) => {
                        if (editing) {
                          setDraft({ ...draft, group_name: e.target.value });
                        } else {
                          run(() => setGroup(t.id, e.target.value || null));
                        }
                      }}
                    >
                      <option value="">-</option>
                      {GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="space-x-2 p-2 whitespace-nowrap">
                    {editing ? (
                      <>
                        <button
                          disabled={pending}
                          className="rounded bg-black px-2 py-1 text-white disabled:opacity-50"
                          onClick={() =>
                            run(
                              () =>
                                updateTeam(t.id, {
                                  reg_id: draft.reg_id,
                                  leader_name: draft.leader_name,
                                  college_id: draft.college_id,
                                  group_name: draft.group_name || null,
                                }),
                              () => setEditId(null)
                            )
                          }
                        >
                          Save
                        </button>
                        <button
                          className="rounded border px-2 py-1"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="rounded border px-2 py-1"
                          onClick={() => startEdit(t)}
                        >
                          Edit
                        </button>
                        <button
                          disabled={pending}
                          className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-50"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete ${t.team_code} (${t.leader_name})?`
                              )
                            ) {
                              run(() => deleteTeam(t.id));
                            }
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={6}>
                  No teams found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}