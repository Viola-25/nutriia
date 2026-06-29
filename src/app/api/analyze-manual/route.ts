import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import MealRecord from "@/lib/models/MealRecord";
import User from "@/lib/models/User";

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

  const { items, calories, protein, carbs, fat } = await req.json();

  if (!items || calories == null || protein == null || carbs == null || fat == null) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  const record = await MealRecord.findOneAndUpdate(
    { clerkId: userId, date: today },
    {
      $push: {
        meals: {
          items,
          calories: Number(calories),
          protein: Number(protein),
          carbs: Number(carbs),
          fat: Number(fat),
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
    meal: { items, calories: Number(calories), protein: Number(protein), carbs: Number(carbs), fat: Number(fat) },
    dailySummary: record.dailySummary,
  });
}
