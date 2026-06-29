"use client";

import { useState, useRef } from "react";
import axios from "axios";

interface NutritionData {
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export default function MealCapture() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NutritionData | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);

      try {
        const { data } = await axios.post("/api/analyze-meal", {
          image: base64,
        });
        setResult(data.meal);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Analisando..." : "📷 Fotografar Refeição"}
      </button>

      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="mx-auto max-h-64 rounded-lg object-cover"
        />
      )}

      {loading && (
        <div className="animate-pulse space-y-2 rounded-lg bg-gray-100 p-4">
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/2 rounded bg-gray-200" />
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="mb-2 font-semibold text-green-800">Resultado da Análise</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded bg-white p-2 text-center">
              <p className="text-lg font-bold">{result.total_calories}</p>
              <p className="text-gray-500">Calorias</p>
            </div>
            <div className="rounded bg-white p-2 text-center">
              <p className="text-lg font-bold">{result.protein_g}g</p>
              <p className="text-gray-500">Proteínas</p>
            </div>
            <div className="rounded bg-white p-2 text-center">
              <p className="text-lg font-bold">{result.carbs_g}g</p>
              <p className="text-gray-500">Carboidratos</p>
            </div>
            <div className="rounded bg-white p-2 text-center">
              <p className="text-lg font-bold">{result.fat_g}g</p>
              <p className="text-gray-500">Gorduras</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
