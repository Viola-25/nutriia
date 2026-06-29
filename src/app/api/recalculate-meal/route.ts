import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { recalculateMeal } from "@/lib/huggingface";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { ingredients } = await req.json();
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json({ error: "Lista de ingredientes inválida" }, { status: 400 });
  }

  try {
    const result = await recalculateMeal(ingredients);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("recalculateMeal error:", msg);
    return NextResponse.json({ error: "IA temporariamente indisponível." }, { status: 503 });
  }
}
