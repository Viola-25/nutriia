const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_API_BASE = "https://router.huggingface.co";
const HF_MODEL_FOOD = "nateraw/food";
const HF_MODEL_TEXT = "mistralai/Mistral-7B-Instruct-v0.3";

export interface NutritionResult {
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  description: string;
}

function parseNutritionResponse(text: string, fallbackDesc = ""): NutritionResult {
  const result: NutritionResult = {
    total_calories: 450,
    protein_g: 25,
    carbs_g: 50,
    fat_g: 15,
    description: fallbackDesc || "Refeição analisada por IA",
  };

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return result;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    result.total_calories = parsed.total_calories ?? parsed.calories ?? 450;
    result.protein_g = parsed.protein_g ?? parsed.protein ?? 25;
    result.carbs_g = parsed.carbs_g ?? parsed.carbs ?? parsed.carbohydrates ?? 50;
    result.fat_g = parsed.fat_g ?? parsed.fat ?? 15;
    result.description = parsed.description || result.description;
    return result;
  } catch {
    return result;
  }
}

async function hfRequest(url: string, payload: unknown, timeoutMs = 55000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`HF API ${res.status}: ${errorText}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeMealImage(
  base64Image: string
): Promise<NutritionResult> {
  let foodLabel = "";

  try {
    const data: any = await hfRequest(
      `${HF_API_BASE}/hf-inference/models/${HF_MODEL_FOOD}`,
      { inputs: base64Image }
    );

    if (Array.isArray(data) && data.length > 0) {
      foodLabel = data[0]?.label || data[0]?.name || "";
    }
  } catch (err) {
    console.error("Food classification failed:", err);
  }

  const description = foodLabel
    ? `The photo shows: ${foodLabel}. Describe the meal components (in Portuguese), estimate portion sizes in grams, and return nutrition totals.`
    : "Describe this meal's components in Portuguese, estimate portion sizes in grams, and return nutrition totals.";

  const prompt = `<s>[INST] ${description}

Return ONLY a valid JSON object (no markdown, no extra text) with these keys:
- description (string, in Portuguese, describing what food items are present, e.g. "Prato com arroz, feijão, bife grelhado e salada")
- total_calories (number)
- protein_g (number)
- carbs_g (number)
- fat_g (number)

Use realistic Brazilian portion sizes. [/INST]`;

  try {
    const data: any = await hfRequest(
      `${HF_API_BASE}/models/${HF_MODEL_TEXT}`,
      {
        inputs: prompt,
        parameters: { max_new_tokens: 300, temperature: 0.1, return_full_text: false },
      },
      30000
    );

    const text = data?.[0]?.generated_text ?? (typeof data === "string" ? data : "");
    return parseNutritionResponse(text, foodLabel || "Refeição analisada por IA");
  } catch (err) {
    console.error("Mistral analysis failed:", err);
    return {
      total_calories: 450,
      protein_g: 25,
      carbs_g: 50,
      fat_g: 15,
      description: foodLabel || "Refeição analisada por IA",
    };
  }
}

export async function analyzeMealText(
  description: string
): Promise<NutritionResult> {
  const prompt = `<s>[INST] Given this meal description in Portuguese: "${description}"

Return ONLY a valid JSON object (no markdown, no extra text) with these keys:
- description (string, in Portuguese, briefly listing the items, e.g. "Ovos mexidos, aveia com leite, banana")
- total_calories (number)
- protein_g (number)
- carbs_g (number)
- fat_g (number)

Use realistic Brazilian portion sizes. [/INST]`;

  try {
    const data: any = await hfRequest(
      `${HF_API_BASE}/models/${HF_MODEL_TEXT}`,
      {
        inputs: prompt,
        parameters: { max_new_tokens: 300, temperature: 0.1, return_full_text: false },
      },
      30000
    );

    const text = data?.[0]?.generated_text ?? (typeof data === "string" ? data : "");
    return parseNutritionResponse(text, description);
  } catch (err) {
    console.error("analyzeMealText error:", err);
    throw err;
  }
}
