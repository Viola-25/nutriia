"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (isSignedIn) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        <span className="text-green-600">Nutri</span>IA
      </h1>
      <p className="max-w-md text-lg text-gray-600">
        Rastreie sua alimentação com inteligência artificial.
        Tire uma foto da sua refeição e descubra os macronutrientes instantaneamente.
      </p>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
        >
          Entrar
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Cadastrar
        </Link>
      </div>
    </div>
  );
}
