"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ACTIVITY_FACTORS } from "@/lib/calculations";
import type { Sex, ActivityLevel, GoalType } from "@/lib/calculations";

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentário (pouco ou nenhum exercício)",
  light: "Leve (1-3 dias/semana)",
  moderate: "Moderado (3-5 dias/semana)",
  active: "Ativo (6-7 dias/semana)",
  very_active: "Muito ativo (atleta/ trabalho físico)",
};

export default function OnboardingPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    age: "",
    weight: "",
    height: "",
    sex: "male" as Sex,
    activityLevel: "moderate" as ActivityLevel,
    goalType: "deficit" as GoalType,
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/onboarding", form);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) return <p className="p-8 text-center">Carregando...</p>;

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-2xl font-bold">Seu Perfil Nutricional</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Idade</label>
            <input
              type="number"
              required
              className="w-full rounded-lg border px-3 py-2"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sexo</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}
            >
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              required
              className="w-full rounded-lg border px-3 py-2"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Altura (cm)</label>
            <input
              type="number"
              step="0.1"
              required
              className="w-full rounded-lg border px-3 py-2"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Nível de Atividade</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.activityLevel}
            onChange={(e) =>
              setForm({ ...form, activityLevel: e.target.value as ActivityLevel })
            }
          >
            {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((key) => (
              <option key={key} value={key}>
                {ACTIVITY_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Meta Calórica</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.goalType}
            onChange={(e) =>
              setForm({ ...form, goalType: e.target.value as GoalType })
            }
          >
            <option value="deficit">Déficit (perder peso)</option>
            <option value="maintain">Manutenção</option>
            <option value="surplus">Superávit (ganhar massa)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Perfil"}
        </button>
      </form>
    </div>
  );
}
