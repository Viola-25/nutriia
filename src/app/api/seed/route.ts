import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import MealRecord from "@/lib/models/MealRecord";

const SEED_MEALS = [
  {
    dateOffset: 0,
    meals: [
      {
        items: "Ovos mexidos (3 unidades) + Aveia (40g) com leite",
        calories: 420,
        protein: 28,
        carbs: 35,
        fat: 18,
      },
      {
        items: "Frango grelhado (200g) + Arroz branco (200g) + Purê de batata (150g)",
        calories: 720,
        protein: 52,
        carbs: 65,
        fat: 22,
      },
      {
        items: "Brócolis (100g) + Cenoura (100g) cozidos + Azeite (15ml)",
        calories: 180,
        protein: 6,
        carbs: 18,
        fat: 10,
      },
    ],
  },
  {
    dateOffset: 1,
    meals: [
      {
        items: "Ovos mexidos (4 unidades) + Pão integral (2 fatias)",
        calories: 480,
        protein: 32,
        carbs: 30,
        fat: 24,
      },
      {
        items: "Frango grelhado (250g) + Arroz integral (200g) + Legumes salteados",
        calories: 680,
        protein: 58,
        carbs: 60,
        fat: 18,
      },
    ],
  },
  {
    dateOffset: 2,
    meals: [
      {
        items: "Vitamina de banana com whey protein + Aveia",
        calories: 380,
        protein: 35,
        carbs: 40,
        fat: 8,
      },
      {
        items: "Carne moída (200g) + Arroz (200g) + Feijão (150ml)",
        calories: 760,
        protein: 48,
        carbs: 70,
        fat: 25,
      },
      {
        items: "Batata doce assada (200g) + Frango desfiado (150g)",
        calories: 500,
        protein: 40,
        carbs: 55,
        fat: 10,
      },
    ],
  },
  {
    dateOffset: 3,
    meals: [
      {
        items: "Panqueca de banana com aveia e mel",
        calories: 350,
        protein: 18,
        carbs: 50,
        fat: 10,
      },
      {
        items: "Salmão grelhado (200g) + Quinoa (150g) + Aspargos",
        calories: 650,
        protein: 50,
        carbs: 40,
        fat: 28,
      },
    ],
  },
  {
    dateOffset: 4,
    meals: [
      {
        items: "Café da manhã: Ovos + Tapioca + Queijo branco",
        calories: 450,
        protein: 30,
        carbs: 35,
        fat: 20,
      },
      {
        items: "Strogonoff de frango (250g) + Arroz (200g) + Batata palha",
        calories: 780,
        protein: 45,
        carbs: 60,
        fat: 32,
      },
    ],
  },
  {
    dateOffset: 5,
    meals: [
      {
        items: "Whey protein shake + Banana + Aveia",
        calories: 320,
        protein: 35,
        carbs: 35,
        fat: 5,
      },
      {
        items: "Filé mignon (200g) + Arroz (150g) + Farofa + Vinagrete",
        calories: 720,
        protein: 50,
        carbs: 45,
        fat: 30,
      },
      {
        items: "Omelete de claras (4) + Salada verde",
        calories: 250,
        protein: 25,
        carbs: 8,
        fat: 12,
      },
    ],
  },
  {
    dateOffset: 6,
    meals: [
      {
        items: "Café da manhã: Mingau de aveia + Whey + Frutas",
        calories: 400,
        protein: 32,
        carbs: 45,
        fat: 8,
      },
      {
        items: "Peito de frango (250g) + Batata doce (300g) + Brócolis",
        calories: 650,
        protein: 55,
        carbs: 65,
        fat: 12,
      },
      {
        items: "Jantar: Omelete (3 ovos) + Arroz integral (100g)",
        calories: 420,
        protein: 28,
        carbs: 30,
        fat: 20,
      },
    ],
  },
];

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await dbConnect();

  const existingUser = await User.findOne({ clerkId: userId });
  let profile: typeof existingUser;

  if (!existingUser) {
    const bmr = 10 * 80 + 6.25 * 178 - 5 * 22 + 5;
    const tdee = Math.round(bmr * 1.725);
    const goalCalories = Math.round(tdee - 500);

    profile = await User.create({
      clerkId: userId,
      age: 22,
      weight: 80,
      height: 178,
      sex: "male",
      activityLevel: "active",
      goalType: "deficit",
      bmr,
      tdee,
      goalCalories,
    });
  } else {
    profile = existingUser;
  }

  const today = new Date();
  const records = [];

  for (const day of SEED_MEALS) {
    const date = new Date(today);
    date.setDate(date.getDate() - day.dateOffset);
    const dateStr = date.toISOString().split("T")[0];

    const totalCalories = day.meals.reduce((s, m) => s + m.calories, 0);
    const totalProtein = day.meals.reduce((s, m) => s + m.protein, 0);
    const totalCarbs = day.meals.reduce((s, m) => s + m.carbs, 0);
    const totalFat = day.meals.reduce((s, m) => s + m.fat, 0);

    const record = await MealRecord.findOneAndUpdate(
      { clerkId: userId, date: dateStr },
      {
        clerkId: userId,
        date: dateStr,
        meals: day.meals.map((m) => ({ ...m, timestamp: new Date(date) })),
        dailySummary: {
          caloriesConsumed: totalCalories,
          goalCalories: profile.goalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        },
      },
      { upsert: true, new: true }
    );

    records.push(record);
  }

  return NextResponse.json({
    message: "Dados de teste populados com sucesso",
    profile,
    recordsCount: records.length,
  });
}
