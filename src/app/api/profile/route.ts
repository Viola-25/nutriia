import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  calculateBMR,
  calculateTDEE,
  calculateGoalCalories,
} from "@/lib/calculations";
import type { Sex, ActivityLevel, GoalType } from "@/lib/calculations";

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ clerkId: userId }).lean();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { age, weight, height, sex, activityLevel, goalType } = body;

  if (!age || !weight || !height || !sex || !activityLevel) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  await dbConnect();

  const bmr = calculateBMR(Number(weight), Number(height), Number(age), sex as Sex);
  const tdee = calculateTDEE(bmr, activityLevel as ActivityLevel);
  const goalCalories = calculateGoalCalories(tdee, (goalType as GoalType) ?? "maintain");

  const user = await User.findOneAndUpdate(
    { clerkId: userId },
    {
      clerkId: userId,
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      sex,
      activityLevel,
      goalType: goalType ?? "maintain",
      bmr,
      tdee,
      goalCalories,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ user });
}
