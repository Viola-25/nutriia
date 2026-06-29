import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import MealRecord from "@/lib/models/MealRecord";
import User from "@/lib/models/User";

export async function PUT(
  req: NextRequest,
  { params }: { params: { mealId: string } }
) {
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
  if (!items) {
    return NextResponse.json({ error: "Descrição obrigatória" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  const record = await MealRecord.findOne({ clerkId: userId, date: today });
  if (!record) {
    return NextResponse.json({ error: "Nenhum registro hoje" }, { status: 404 });
  }

  const meal = record.meals.id(params.mealId);
  if (!meal) {
    return NextResponse.json({ error: "Refeição não encontrada" }, { status: 404 });
  }

  meal.items = items;
  meal.calories = Number(calories) || 0;
  meal.protein = Number(protein) || 0;
  meal.carbs = Number(carbs) || 0;
  meal.fat = Number(fat) || 0;

  const totals = record.meals.reduce(
    (acc, m) => ({
      caloriesConsumed: acc.caloriesConsumed + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { caloriesConsumed: 0, protein: 0, carbs: 0, fat: 0 }
  );

  record.dailySummary = { ...totals, goalCalories: user.goalCalories };
  await record.save();

  return NextResponse.json({ meal, dailySummary: record.dailySummary });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { mealId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];

  const record = await MealRecord.findOne({ clerkId: userId, date: today });
  if (!record) {
    return NextResponse.json({ error: "Nenhum registro hoje" }, { status: 404 });
  }

  const meal = record.meals.id(params.mealId);
  if (!meal) {
    return NextResponse.json({ error: "Refeição não encontrada" }, { status: 404 });
  }

  meal.deleteOne();

  const totals = record.meals.reduce(
    (acc, m) => ({
      caloriesConsumed: acc.caloriesConsumed + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { caloriesConsumed: 0, protein: 0, carbs: 0, fat: 0 }
  );

  record.dailySummary = { ...totals, goalCalories: user.goalCalories };
  await record.save();

  return NextResponse.json({ dailySummary: record.dailySummary });
}
