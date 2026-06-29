import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET(req: NextRequest) {
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
