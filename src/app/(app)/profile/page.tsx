"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ACTIVITY_FACTORS } from "@/lib/calculations";
import type { Sex, ActivityLevel, GoalType } from "@/lib/calculations";

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentário",
  light: "Leve",
  moderate: "Moderado",
  active: "Ativo",
  very_active: "Muito ativo",
};

const GOAL_LABELS: Record<GoalType, string> = {
  deficit: "Déficit (perder peso)",
  maintain: "Manutenção",
  surplus: "Superávit (ganhar massa)",
};

interface UserProfile {
  age: number;
  weight: number;
  height: number;
  sex: string;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  bmr: number;
  tdee: number;
  goalCalories: number;
}

export default function ProfilePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    age: "",
    weight: "",
    height: "",
    sex: "male" as Sex,
    activityLevel: "moderate" as ActivityLevel,
    goalType: "maintain" as GoalType,
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (isLoaded && isSignedIn) {
      loadProfile();
    }
  }, [isLoaded, isSignedIn, router]);

  async function loadProfile() {
    try {
      const res = await axios.get("/api/profile");
      if (res.data.user) {
        const u = res.data.user;
        setProfile(u);
        setForm({
          age: String(u.age),
          weight: String(u.weight),
          height: String(u.height),
          sex: u.sex,
          activityLevel: u.activityLevel,
          goalType: u.goalType ?? "maintain",
        });
      } else {
        router.push("/onboarding");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put("/api/profile", form);
      setProfile(res.data.user);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Editar Perfil
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Idade</label>
              <input
                type="number"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sexo</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Altura (cm)</label>
              <input
                type="number"
                step="0.1"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nível de Atividade</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={form.activityLevel}
                onChange={(e) =>
                  setForm({ ...form, activityLevel: e.target.value as ActivityLevel })
                }
              >
                {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((k) => (
                  <option key={k} value={k}>
                    {ACTIVITY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Meta Calórica</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={form.goalType}
                onChange={(e) => setForm({ ...form, goalType: e.target.value as GoalType })}
              >
                <option value="deficit">Déficit</option>
                <option value="maintain">Manutenção</option>
                <option value="surplus">Superávit</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">Dados Físicos</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Idade</span>
                <span className="font-medium">{profile.age} anos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sexo</span>
                <span className="font-medium">{profile.sex === "male" ? "Masculino" : "Feminino"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Peso</span>
                <span className="font-medium">{profile.weight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Altura</span>
                <span className="font-medium">{profile.height} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Atividade</span>
                <span className="font-medium capitalize">{ACTIVITY_LABELS[profile.activityLevel]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Meta</span>
                <span className="font-medium">{GOAL_LABELS[profile.goalType]}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">Metabolismo</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">TMB (Basal)</span>
                <span className="font-medium text-emerald-700">{profile.bmr} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TDEE (Gasto Total)</span>
                <span className="font-medium text-emerald-700">{profile.tdee} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Meta Diária</span>
                <span className="font-semibold text-emerald-700">{profile.goalCalories} kcal</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              <p className="font-medium">Fórmula de Mifflin-St Jeor</p>
              <p className="mt-1 text-emerald-600">
                TMB = (10 × {profile.weight}) + (6.25 × {profile.height}) - (5 × {profile.age}) +{" "}
                {profile.sex === "male" ? "5" : "(-161)"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
