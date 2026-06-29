"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";
import MealCapture from "./MealCapture";

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

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayRecord, setTodayRecord] = useState<MealRecord | null>(null);
  const [weekRecords, setWeekRecords] = useState<MealRecord[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
        if (!res.data.user) {
          router.push("/onboarding");
        }
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

  if (!isLoaded || !loaded) {
    return <p className="p-8 text-center text-gray-500">Carregando...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NutriIA</h1>
          {profile && (
            <p className="text-sm text-gray-500">
              TMB: {profile.bmr} kcal | Gasto Total: {profile.tdee} kcal | Meta:{" "}
              {profile.goalCalories} kcal
            </p>
          )}
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
        >
          {seeding ? "Populando..." : "Popular Dados de Teste"}
        </button>
      </header>

      <MealCapture />

      {todayRecord && (
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Resumo de Hoje</h2>
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span>Calorias</span>
              <span>
                {todayRecord.dailySummary.caloriesConsumed} /{" "}
                {todayRecord.dailySummary.goalCalories}
              </span>
            </div>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${Math.min(
                    (todayRecord.dailySummary.caloriesConsumed /
                      todayRecord.dailySummary.goalCalories) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded bg-blue-50 p-2">
              <p className="font-semibold text-blue-700">
                {todayRecord.dailySummary.protein}g
              </p>
              <p className="text-blue-500">Proteínas</p>
            </div>
            <div className="rounded bg-orange-50 p-2">
              <p className="font-semibold text-orange-700">
                {todayRecord.dailySummary.carbs}g
              </p>
              <p className="text-orange-500">Carboidratos</p>
            </div>
            <div className="rounded bg-red-50 p-2">
              <p className="font-semibold text-red-700">
                {todayRecord.dailySummary.fat}g
              </p>
              <p className="text-red-500">Gorduras</p>
            </div>
          </div>
        </section>
      )}

      {weekRecords.length > 0 && (
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Últimos 7 Dias</h2>
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
                <div key={record._id} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-gray-600">
                    {date.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-gray-600">
                    {record.dailySummary.caloriesConsumed} kcal
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
