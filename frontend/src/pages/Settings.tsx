import { useState, type FormEvent } from "react";
import { ErrorBanner, Spinner } from "../components/Feedback";
import SkillBadge from "../components/SkillBadge";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage } from "../services/api";
import type { Proficiency, Skill } from "../types";
import { PROFICIENCIES } from "../types";
import { useApi } from "../utils/useApi";

export default function Settings() {
  const { user } = useAuth();
  const { data: skills, setData, loading, error, reload } = useApi<Skill[]>("/skills", []);
  const [name, setName]   = useState("");
  const [level, setLevel] = useState<Proficiency>("Beginner");
  const [years, setYears] = useState("0");
  const [busy, setBusy]   = useState(false);
  const [actionError, setActionError] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true); setActionError("");
    try {
      const { data } = await api.post<Skill>("/skills", { skill_name: name.trim(), proficiency: level, years_experience: Number(years) || 0 });
      setData(list => [...list, data].sort((a, b) => a.skill_name.localeCompare(b.skill_name)));
      setName(""); setYears("0");
    } catch (err) { setActionError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  async function update(s: Skill, proficiency: Proficiency) {
    try {
      const { data } = await api.put<Skill>(`/skills/${s.id}`, { proficiency });
      setData(list => list.map(x => x.id === s.id ? data : x));
    } catch (err) { setActionError(errorMessage(err)); }
  }

  async function remove(s: Skill) {
    try {
      await api.delete(`/skills/${s.id}`);
      setData(list => list.filter(x => x.id !== s.id));
    } catch (err) { setActionError(errorMessage(err)); }
  }

  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="max-w-3xl space-y-5">

      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">Manage your profile and skills</p>
      </div>

      {/* Account card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Account</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white select-none">
            {initials}
          </div>
          <div>
            {user?.full_name && <p className="font-semibold text-gray-900">{user.full_name}</p>}
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="mt-1.5 inline-block rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Skills card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-gray-700">Your skills</h3>
        <p className="mb-5 text-xs text-gray-400">The JD Analyzer scores job matches against this list.</p>

        {(error || actionError) && <ErrorBanner message={error || actionError} onRetry={error ? reload : undefined} />}

        {loading ? <Spinner /> : skills.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-500">No skills added yet.</p>
            <p className="mt-1 text-xs text-gray-400">Add technologies below to improve your match scores.</p>
          </div>
        ) : (
          <div className="mb-5 flex flex-wrap gap-2">
            {skills.map(s => (
              <div key={s.id} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                <SkillBadge name={s.skill_name} proficiency={s.proficiency} onRemove={() => remove(s)} />
                <select
                  aria-label={`Level for ${s.skill_name}`}
                  className="input !w-auto !py-0.5 !text-xs"
                  value={s.proficiency}
                  onChange={e => update(s, e.target.value as Proficiency)}
                >
                  {PROFICIENCIES.map(p => <option key={p}>{p}</option>)}
                </select>
                <span className="text-xs text-gray-400">{s.years_experience}y</span>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-600">Add a skill</p>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_9rem_5rem_auto] sm:items-end">
            <div>
              <label className="label" htmlFor="s-name">Skill name</label>
              <input id="s-name" required maxLength={100} className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Python, React, SQL" />
            </div>
            <div>
              <label className="label" htmlFor="s-level">Level</label>
              <select id="s-level" className="input" value={level} onChange={e => setLevel(e.target.value as Proficiency)}>
                {PROFICIENCIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="s-years">Years</label>
              <input id="s-years" type="number" min={0} max={60} step={0.5} className="input" value={years} onChange={e => setYears(e.target.value)} />
            </div>
            <button className="btn-primary" disabled={busy || !name.trim()}>Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}
