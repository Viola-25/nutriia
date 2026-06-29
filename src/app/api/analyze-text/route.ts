import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import MealRecord from "@/lib/models/MealRecord";
import User from "@/lib/models/User";
import { analyzeMealText, type NutritionResult } from "@/lib/huggingface";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }

  const { description } = await req.json();
  if (!description || typeof description !== "string") {
    return NextResponse.json({ error: "Descrição inválida" }, { status: 400 });
  }

  let nutrition: NutritionResult;
  try {
    nutrition = await analyzeMealText(description);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("analyzeMealText error:", msg);
    return NextResponse.json({ error: "IA temporariamente indisponível." }, { status: 503 });
  }

  const today = new Date().toISOString().split("T")[0];

  const record = await MealRecord.findOneAndUpdate(
    { clerkId: userId, date: today },
    {
      $push: {
        meals: {
          items: nutrition.description,
          calories: nutrition.total_calories,
          protein: nutrition.protein_g,
          carbs: nutrition.carbs_g,
          fat: nutrition.fat_g,
          timestamp: new Date(),
        },
      },
      $setOnInsert: {
        clerkId: userId,
        date: today,
      },
    },
    { upsert: true, new: true }
  );

  const totals = record.meals.reduce(
    (acc, m) => ({
      caloriesConsumed: acc.caloriesConsumed + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { caloriesConsumed: 0, protein: 0, carbs: 0, fat: 0 }
  );

  record.dailySummary = {
    ...totals,
    goalCalories: user.goalCalories,
  };

  await record.save();

  return NextResponse.json({
    meal: {
      items: description,
      ...nutrition,
    },
    dailySummary: record.dailySummary,
  });
}
