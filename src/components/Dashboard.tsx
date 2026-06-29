"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";

interface UserProfile {
  age: number;
  weight: number;
  height: number;
  sex: string;
  bmr: number;
  tdee: number;
  goalCalories: number;
}

interface Meal {
  items: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

interface DailySummary {
  caloriesConsumed: number;
  goalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealRecord {
  _id: string;
  date: string;
  meals: Meal[];
  dailySummary: DailySummary;
}

type EntryTab = "photo" | "text";

function MealCard({ meal }: { meal: Meal }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <p className="font-medium text-gray-900">{meal.items}</p>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          {meal.calories} kcal
        </span>
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">
          P: {meal.protein}g
        </span>
        <span className="rounded bg-orange-50 px-2 py-1 text-orange-700">
          C: {meal.carbs}g
        </span>
        <span className="rounded bg-red-50 px-2 py-1 text-red-700">
          G: {meal.fat}g
        </span>
      </div>
    </div>
  );
}

function ProgressBar({
  current,
  goal,
  label,
  unit,
  color,
}: {
  current: number;
  goal: number;
  label: string;
  unit: string;
  color: string;
}) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold">
          {current}
          <span className="text-gray-400 font-normal">
            {" "}/{goal} {unit}
          </span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayRecord, setTodayRecord] = useState<MealRecord | null>(null);
  const [weekRecords, setWeekRecords] = useState<MealRecord[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [entryTab, setEntryTab] = useState<EntryTab>("photo");
  const [textInput, setTextInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const [profileRes, mealsRes] = await Promise.all([
      axios.get("/api/profile"),
      axios.get(
        `/api/meals?start=${weekAgo.toISOString().split("T")[0]}&end=${today.toISOString().split("T")[0]}`
      ),
    ]);

    setProfile(profileRes.data.user);
    const records: MealRecord[] = mealsRes.data.records;
    setWeekRecords(records);

    const todayStr = today.toISOString().split("T")[0];
    setTodayRecord(records.find((r) => r.date === todayStr) ?? null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (isLoaded && isSignedIn) {
      fetchData();
    }
  }, [isLoaded, isSignedIn, router, fetchData]);

  useEffect(() => {
    if (isLoaded && isSignedIn && profile === null && loaded) {
      const checkProfile = async () => {
        const res = await axios.get("/api/profile");
        if (!res.data.user) router.push("/onboarding");
      };
      checkProfile();
    }
  }, [isLoaded, isSignedIn, profile, loaded, router]);

  async function handleSeed() {
    setSeeding(true);
    try {
      await axios.post("/api/seed");
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  }

  async function handleImageCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);
      try {
        await axios.post("/api/analyze-meal", { image: base64 });
        await fetchData();
      } catch (err) {
        console.error(err);
      } finally {
        setAnalyzing(false);
        setPreview(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;
    setAnalyzing(true);
    try {
      await axios.post("/api/analyze-text", { description: textInput.trim() });
      setTextInput("");
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  }

  if (!isLoaded || !loaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  const ds = todayRecord?.dailySummary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {profile && (
            <p className="text-sm text-gray-500">
              TMB: {profile.bmr} kcal · Gasto Total: {profile.tdee} kcal · Meta:{" "}
              {profile.goalCalories} kcal
            </p>
          )}
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {seeding ? "Populando..." : "Popular Dados de Teste"}
        </button>
      </div>

      {ds && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ProgressBar
            current={ds.caloriesConsumed}
            goal={ds.goalCalories}
            label="Calorias"
            unit="kcal"
            color="bg-emerald-500"
          />
          <ProgressBar
            current={ds.protein}
            goal={Math.round(ds.goalCalories * 0.15)}
            label="Proteínas"
            unit="g"
            color="bg-blue-500"
          />
          <ProgressBar
            current={ds.carbs}
            goal={Math.round(ds.goalCalories * 0.1)}
            label="Carboidratos"
            unit="g"
            color="bg-orange-500"
          />
          <ProgressBar
            current={ds.fat}
            goal={Math.round(ds.goalCalories * 0.035)}
            label="Gorduras"
            unit="g"
            color="bg-red-500"
          />
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setEntryTab("photo")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                entryTab === "photo"
                  ? "border-b-2 border-emerald-500 text-emerald-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📷 Foto
            </button>
            <button
              onClick={() => setEntryTab("text")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                entryTab === "text"
                  ? "border-b-2 border-emerald-500 text-emerald-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📝 Texto
            </button>
          </div>
        </div>
        <div className="p-4">
          {entryTab === "photo" ? (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={analyzing}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-gray-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
                    Analisando imagem...
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📸</span>
                    <span className="font-medium">
                      Clique para capturar ou enviar foto
                    </span>
                  </>
                )}
              </button>
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="mx-auto max-h-48 rounded-lg object-cover shadow-sm"
                />
              )}
            </div>
          ) : (
            <form onSubmit={handleTextSubmit} className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ex: 2 ovos mexidos, 40g de aveia com leite, 1 banana"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={analyzing || !textInput.trim()}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {analyzing ? (
                  <span className="inline-flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Analisando...
                  </span>
                ) : (
                  "Analisar Refeição"
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {todayRecord && todayRecord.meals.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Refeições de Hoje
          </h2>
          <div className="space-y-3">
            {todayRecord.meals.map((meal, idx) => (
              <MealCard key={idx} meal={meal} />
            ))}
          </div>
        </section>
      )}

      {weekRecords.length > 0 && (
        <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Últimos 7 Dias
          </h2>
          <div className="space-y-2">
            {weekRecords.map((record) => {
              const pct = record.dailySummary.goalCalories
                ? Math.min(
                    (record.dailySummary.caloriesConsumed /
                      record.dailySummary.goalCalories) *
                      100,
                    100
                  )
                : 0;
              const date = new Date(record.date + "T12:00:00");
              return (
                <div
                  key={record._id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <span className="w-20 text-sm font-medium text-gray-600">
                    {date.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-sm font-medium text-gray-700">
                    {record.dailySummary.caloriesConsumed} kcal
                  </span>
                  <span className="w-16 text-right text-xs text-gray-400">
                    {record.meals.length} refeições
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
