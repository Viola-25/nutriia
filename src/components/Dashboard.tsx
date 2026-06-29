"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";
import { compressImage } from "@/lib/image";

interface UserProfile {
  age: number;
  weight: number;
  height: number;
  sex: string;
  bmr: number;
  tdee: number;
  goalCalories: number;
}

interface IIngredient {
  _id: string;
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  _id: string;
  items: string;
  ingredients: IIngredient[];
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

type EntryTab = "photo" | "text";

function EditableIngredientRow({
  ingredient,
  onSave,
  onDelete,
}: {
  ingredient: IIngredient;
  onSave: (id: string, name: string, quantity: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ingredient.name);
  const [quantity, setQuantity] = useState(ingredient.quantity);

  return editing ? (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-emerald-500"
      />
      <input
        type="text"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-20 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-emerald-500"
      />
      <button
        onClick={() => { onSave(ingredient._id, name, quantity); setEditing(false); }}
        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
      >
        Salvar
      </button>
      <button
        onClick={() => setEditing(false)}
        className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
      >
        Cancelar
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-900">{ingredient.name}</span>
        <span className="text-gray-400">{ingredient.quantity}</span>
        <span className="text-xs text-gray-500">
          {ingredient.calories} kcal · P: {ingredient.protein}g · C: {ingredient.carbs}g · G: {ingredient.fat}g
        </span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(ingredient._id)}
          className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:text-red-700"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

function MealCard({
  meal,
  onDelete,
  onRecalculate,
  onAddIngredient,
  onDeleteIngredient,
  recalculating,
}: {
  meal: Meal;
  onDelete: (mealId: string) => void;
  onRecalculate: (mealId: string, ingredients: { name: string; quantity: string }[]) => void;
  onAddIngredient: (mealId: string) => void;
  onDeleteIngredient: (mealId: string, ingredientId: string) => void;
  recalculating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <p className="font-medium text-gray-900">{meal.items}</p>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            {meal.calories} kcal
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">P: {meal.protein}g</span>
            <span className="rounded bg-orange-50 px-2 py-1 text-orange-700">C: {meal.carbs}g</span>
            <span className="rounded bg-red-50 px-2 py-1 text-red-700">G: {meal.fat}g</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded px-2 py-1 text-xs text-emerald-600 transition-colors hover:bg-emerald-50"
            >
              {expanded ? "Ocultar ingredientes" : `${meal.ingredients?.length || 0} ingredientes`}
            </button>
            <button
              onClick={() => onDelete(meal._id)}
              className="rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="animate-fade-in border-t border-gray-100 p-4 pt-3">
          <div className="space-y-1.5">
            {(meal.ingredients || []).map((ing) => (
              <EditableIngredientRow
                key={ing._id}
                ingredient={ing}
                onSave={(id, name, quantity) => {
                  const updated = meal.ingredients.map((i) =>
                    i._id === id ? { ...i, name, quantity } : i
                  );
                  onRecalculate(
                    meal._id,
                    updated.map((i) => ({ name: i.name, quantity: i.quantity }))
                  );
                }}
                onDelete={(id) => onDeleteIngredient(meal._id, id)}
              />
            ))}
          </div>
          <button
            onClick={() => onAddIngredient(meal._id)}
            disabled={recalculating}
            className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600"
          >
            + Adicionar ingrediente
          </button>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="h-3 w-1/2 rounded bg-gray-200" />
      <div className="flex gap-4">
        <div className="h-8 w-full rounded bg-gray-200" />
        <div className="h-8 w-full rounded bg-gray-200" />
        <div className="h-8 w-full rounded bg-gray-200" />
        <div className="h-8 w-full rounded bg-gray-200" />
      </div>
    </div>
  );
}

function ProgressBar({
  current,
  goal,
  label,
  unit,
  color,
}: {
  current: number;
  goal: number;
  label: string;
  unit: string;
  color: string;
}) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold">
          {current}
          <span className="text-gray-400 font-normal">
            {" "}/{goal} {unit}
          </span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const AI_TIMEOUT = 50000;

const MACRO_PLACEHOLDERS = {
  calorie: "Ex: 450",
  protein: "Ex: 28",
  carbs: "Ex: 35",
  fat: "Ex: 18",
};

const LOADING_MESSAGES: Record<EntryTab, string[]> = {
  photo: [
    "Otimizando a imagem...",
    "Enviando para o modelo de visão...",
    "Calculando macronutrientes...",
    "Interpretando os dados...",
  ],
  text: [
    "Interpretando sua descrição...",
    "Analisando ingredientes...",
    "Calculando macronutrientes...",
    "Montando resultado...",
  ],
};

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayRecord, setTodayRecord] = useState<MealRecord | null>(null);
  const [weekRecords, setWeekRecords] = useState<MealRecord[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [entryTab, setEntryTab] = useState<EntryTab>("photo");
  const [textInput, setTextInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [timeoutError, setTimeoutError] = useState(false);
  const [manualMode, setManualMode] = useState<"off" | "ai" | "full">("off");
  const [manualText, setManualText] = useState("");
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [editForm, setEditForm] = useState({ items: "", calories: "", protein: "", carbs: "", fat: "" });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    items: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [addIngredientFor, setAddIngredientFor] = useState<string | null>(null);
  const [newIngredient, setNewIngredient] = useState({ name: "", quantity: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    if (!analyzing) {
      setLoadingIndex(0);
      return;
    }
    const messages = LOADING_MESSAGES[entryTab];
    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [analyzing, entryTab]);

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
        if (!res.data.user) router.push("/onboarding");
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

  function cancelRequest() {
    abortRef.current?.abort();
  }

  async function postWithTimeout<T>(url: string, data: unknown): Promise<T> {
    cancelRequest();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);
    try {
      const res = await axios.post<T>(url, data, { signal: controller.signal });
      return res.data;
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function handleImageCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setTimeoutError(false);
    setManualMode("off");
    setPreview(null);

    try {
      const base64 = await compressImage(file);
      setPreview(`data:image/jpeg;base64,${base64}`);
      await postWithTimeout("/api/analyze-meal", { image: base64 });
      await fetchData();
    } catch (err: unknown) {
      if (axios.isCancel(err)) {
        setTimeoutError(true);
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        console.error("Erro da API:", err.response.data.error);
      }
      setTimeoutError(true);
    } finally {
      setAnalyzing(false);
      setPreview(null);
    }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;
    setAnalyzing(true);
    setTimeoutError(false);
    setManualMode("off");
    try {
      await postWithTimeout("/api/analyze-text", { description: textInput.trim() });
      setTextInput("");
      await fetchData();
    } catch (err: unknown) {
      if (axios.isCancel(err) || (err instanceof DOMException && err.name === "AbortError")) {
        setTimeoutError(true);
      } else {
        setTimeoutError(true);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleManualTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim()) return;
    setAnalyzing(true);
    setTimeoutError(false);
    try {
      await postWithTimeout("/api/analyze-text", { description: manualText.trim() });
      setManualText("");
      setManualMode("off");
      await fetchData();
    } catch (err: unknown) {
      setManualMode("full");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualForm.items.trim()) return;
    setAnalyzing(true);
    try {
      await axios.post("/api/analyze-manual", {
        items: manualForm.items.trim(),
        calories: Number(manualForm.calories) || 0,
        protein: Number(manualForm.protein) || 0,
        carbs: Number(manualForm.carbs) || 0,
        fat: Number(manualForm.fat) || 0,
      });
      setManualForm({ items: "", calories: "", protein: "", carbs: "", fat: "" });
      setManualMode("off");
      setTimeoutError(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  }

  function startEdit(meal: Meal) {
    setEditingMeal(meal);
    setEditForm({
      items: meal.items,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMeal || !editForm.items.trim()) return;
    try {
      await axios.put(`/api/meals/${editingMeal._id}`, {
        items: editForm.items.trim(),
        calories: Number(editForm.calories) || 0,
        protein: Number(editForm.protein) || 0,
        carbs: Number(editForm.carbs) || 0,
        fat: Number(editForm.fat) || 0,
      });
      setEditingMeal(null);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteMeal(mealId: string) {
    if (!confirm("Excluir esta refeição?")) return;
    setDeleting(mealId);
    try {
      await axios.delete(`/api/meals/${mealId}`);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  async function handleRecalculate(mealId: string, ingredients: { name: string; quantity: string }[]) {
    setRecalculating(mealId);
    try {
      const res = await axios.post("/api/recalculate-meal", { ingredients });
      const { result } = res.data;
      await axios.put(`/api/meals/${mealId}`, {
        items: result.description,
        ingredients: result.ingredients.map((ing: any) => ({
          name: ing.name,
          quantity: ing.quantity,
          calories: ing.calories,
          protein: ing.protein_g,
          carbs: ing.carbs_g,
          fat: ing.fat_g,
        })),
        calories: result.total_calories,
        protein: result.protein_g,
        carbs: result.carbs_g,
        fat: result.fat_g,
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(null);
    }
  }

  async function handleAddIngredient(mealId: string) {
    setAddIngredientFor(mealId);
  }

  async function handleSaveNewIngredient(mealId: string) {
    if (!newIngredient.name.trim() || !newIngredient.quantity.trim()) return;
    const meal = todayRecord?.meals.find((m) => m._id === mealId);
    if (!meal) return;
    const updatedIngredients = [
      ...(meal.ingredients || []).map((i) => ({ name: i.name, quantity: i.quantity })),
      { name: newIngredient.name.trim(), quantity: newIngredient.quantity.trim() },
    ];
    setAddIngredientFor(null);
    setNewIngredient({ name: "", quantity: "" });
    await handleRecalculate(mealId, updatedIngredients);
  }

  async function handleDeleteIngredient(mealId: string, ingredientId: string) {
    const meal = todayRecord?.meals.find((m) => m._id === mealId);
    if (!meal) return;
    const remaining = (meal.ingredients || []).filter((i) => i._id !== ingredientId);
    if (remaining.length === 0) return;
    await handleRecalculate(
      mealId,
      remaining.map((i) => ({ name: i.name, quantity: i.quantity }))
    );
  }

  if (!isLoaded || !loaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  const ds = todayRecord?.dailySummary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {profile && (
            <p className="text-sm text-gray-500">
              TMB: {profile.bmr} kcal · Gasto Total: {profile.tdee} kcal · Meta:{" "}
              {profile.goalCalories} kcal
            </p>
          )}
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {seeding ? "Populando..." : "Popular Dados de Teste"}
        </button>
      </div>

      {ds && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ProgressBar
            current={ds.caloriesConsumed}
            goal={ds.goalCalories}
            label="Calorias"
            unit="kcal"
            color="bg-emerald-500"
          />
          <ProgressBar
            current={ds.protein}
            goal={Math.round(ds.goalCalories * 0.15)}
            label="Proteínas"
            unit="g"
            color="bg-blue-500"
          />
          <ProgressBar
            current={ds.carbs}
            goal={Math.round(ds.goalCalories * 0.1)}
            label="Carboidratos"
            unit="g"
            color="bg-orange-500"
          />
          <ProgressBar
            current={ds.fat}
            goal={Math.round(ds.goalCalories * 0.035)}
            label="Gorduras"
            unit="g"
            color="bg-red-500"
          />
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => { setEntryTab("photo"); setTimeoutError(false); setManualMode("off"); }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                entryTab === "photo"
                  ? "border-b-2 border-emerald-500 text-emerald-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📷 Foto
            </button>
            <button
              onClick={() => { setEntryTab("text"); setTimeoutError(false); setManualMode("off"); }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                entryTab === "text"
                  ? "border-b-2 border-emerald-500 text-emerald-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📝 Texto
            </button>
          </div>
        </div>

        {timeoutError && (
          <div className="mx-4 mt-4 animate-fade-in rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⏰</span>
              <div className="flex-1">
                <p className="font-medium text-amber-800">A IA demorou muito para responder</p>
                  <p className="mt-1 text-sm text-amber-700">
                    Você pode descrever a refeição para a IA interpretar ou tentar novamente.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => { setTimeoutError(false); setManualMode("ai"); }}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      Descrever Refeição
                    </button>
                  <button
                    onClick={() => { setTimeoutError(false); fileRef.current?.click(); }}
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Tentar de Novo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {manualMode === "ai" ? (
          <form onSubmit={handleManualTextSubmit} className="animate-fade-in space-y-4 p-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
              A IA demorou muito. Descreva a refeição abaixo que eu tento interpretar:
            </div>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Ex: 2 ovos mexidos, 40g de aveia com leite, 1 banana"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={analyzing || !manualText.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {analyzing ? "Analisando..." : "Analisar com IA"}
              </button>
              <button
                type="button"
                onClick={() => setManualMode("full")}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Inserir valores manualmente
              </button>
              <button
                type="button"
                onClick={() => { setManualMode("off"); setTimeoutError(false); }}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : manualMode === "full" ? (
          <form onSubmit={handleManualSubmit} className="animate-fade-in space-y-4 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Descrição da Refeição</label>
              <input
                type="text"
                required
                placeholder="Ex: Ovos mexidos (200g), Aveia (50g)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={manualForm.items}
                onChange={(e) => setManualForm({ ...manualForm, items: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Calorias</label>
                <input
                  type="number"
                  required
                  placeholder={MACRO_PLACEHOLDERS.calorie}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={manualForm.calories}
                  onChange={(e) => setManualForm({ ...manualForm, calories: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Proteínas (g)</label>
                <input
                  type="number"
                  required
                  placeholder={MACRO_PLACEHOLDERS.protein}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={manualForm.protein}
                  onChange={(e) => setManualForm({ ...manualForm, protein: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Carboidratos (g)</label>
                <input
                  type="number"
                  required
                  placeholder={MACRO_PLACEHOLDERS.carbs}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={manualForm.carbs}
                  onChange={(e) => setManualForm({ ...manualForm, carbs: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Gorduras (g)</label>
                <input
                  type="number"
                  required
                  placeholder={MACRO_PLACEHOLDERS.fat}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={manualForm.fat}
                  onChange={(e) => setManualForm({ ...manualForm, fat: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={analyzing || !manualForm.items.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {analyzing ? "Salvando..." : "Salvar Refeição"}
              </button>
              <button
                type="button"
                onClick={() => { setManualMode("off"); setTimeoutError(false); }}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : entryTab === "photo" ? (
          <div className="space-y-3 p-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
            {analyzing ? (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium text-emerald-700">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
                  {LOADING_MESSAGES.photo[loadingIndex]}
                </div>
                <Skeleton />
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-gray-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span className="text-2xl">📸</span>
                <span className="font-medium">
                  Clique para capturar ou enviar foto
                </span>
              </button>
            )}
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mx-auto max-h-48 rounded-lg object-cover shadow-sm"
              />
            )}
          </div>
        ) : (
          <form onSubmit={handleTextSubmit} className="space-y-3 p-4">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ex: 2 ovos mexidos, 40g de aveia com leite, 1 banana"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {analyzing ? (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium text-emerald-700">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
                  {LOADING_MESSAGES.text[loadingIndex]}
                </div>
                <Skeleton />
              </div>
            ) : (
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                Analisar Refeição
              </button>
            )}
          </form>
        )}
      </div>

      {todayRecord && todayRecord.meals.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Refeições de Hoje
          </h2>
          <div className="space-y-3">
            {todayRecord.meals.map((meal, idx) => (
              <MealCard
                key={meal._id || idx}
                meal={meal}
                onDelete={deleteMeal}
                onRecalculate={handleRecalculate}
                onAddIngredient={handleAddIngredient}
                onDeleteIngredient={handleDeleteIngredient}
                recalculating={recalculating === meal._id}
              />
            ))}
          </div>
        </section>
      )}

      {addIngredientFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm animate-fade-in rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Adicionar Ingrediente</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: Frango grelhado"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Quantidade</label>
                <input
                  type="text"
                  placeholder="Ex: 200g"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleSaveNewIngredient(addIngredientFor)}
                  disabled={!newIngredient.name.trim() || !newIngredient.quantity.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Adicionar e Recalcular
                </button>
                <button
                  onClick={() => { setAddIngredientFor(null); setNewIngredient({ name: "", quantity: "" }); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md animate-fade-in rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Editar Refeição</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={editForm.items}
                  onChange={(e) => setEditForm({ ...editForm, items: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Calorias</label>
                  <input type="number" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={editForm.calories} onChange={(e) => setEditForm({ ...editForm, calories: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Proteínas (g)</label>
                  <input type="number" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={editForm.protein} onChange={(e) => setEditForm({ ...editForm, protein: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Carboidratos (g)</label>
                  <input type="number" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={editForm.carbs} onChange={(e) => setEditForm({ ...editForm, carbs: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Gorduras (g)</label>
                  <input type="number" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={editForm.fat} onChange={(e) => setEditForm({ ...editForm, fat: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  Salvar
                </button>
                <button type="button" onClick={() => setEditingMeal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {weekRecords.length > 0 && (
        <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Últimos 7 Dias
          </h2>
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
                <div
                  key={record._id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <span className="w-20 text-sm font-medium text-gray-600">
                    {date.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-sm font-medium text-gray-700">
                    {record.dailySummary.caloriesConsumed} kcal
                  </span>
                  <span className="w-16 text-right text-xs text-gray-400">
                    {record.meals.length} refeições
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
