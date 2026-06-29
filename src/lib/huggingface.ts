const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_API_BASE = "https://router.huggingface.co/hf-inference";
const HF_MODEL_IMAGE = "Salesforce/blip-image-captioning-base";
const HF_MODEL_TEXT = "mistralai/Mistral-7B-Instruct-v0.3";

export interface NutritionResult {
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

function parseNutritionResponse(text: string): NutritionResult {
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    return getFallbackNutrition();
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      total_calories: parsed.total_calories ?? parsed.calories ?? 0,
      protein_g: parsed.protein_g ?? parsed.protein ?? 0,
      carbs_g: parsed.carbs_g ?? parsed.carbs ?? parsed.carbohydrates ?? 0,
      fat_g: parsed.fat_g ?? parsed.fat ?? 0,
    };
  } catch {
    return getFallbackNutrition();
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
  let caption = "";

  try {
    const data: any = await hfRequest(
      `${HF_API_BASE}/models/${HF_MODEL_IMAGE}`,
      { inputs: base64Image }
    );
    caption =
      data?.[0]?.generated_text ??
      (typeof data === "string" ? data : "");
  } catch (err) {
    console.error("BLIP caption failed:", err);
  }

  const description = caption
    ? `Image shows: ${caption}. Estimate the nutritional content of this meal.`
    : "Estimate a typical balanced meal's nutritional content.";

  const data: any = await hfRequest(
    `${HF_API_BASE}/models/${HF_MODEL_TEXT}`,
    {
      inputs: `<s>[INST] ${description}

Return ONLY a valid JSON object (no markdown, no extra text) with keys: total_calories (number), protein_g (number), carbs_g (number), fat_g (number). Use realistic portion sizes. [/INST]`,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.1,
        return_full_text: false,
      },
    },
    30000
  );

  const text =
    data?.[0]?.generated_text ??
    (typeof data === "string" ? data : "");

  return parseNutritionResponse(text);
}

export async function analyzeMealText(
  description: string
): Promise<NutritionResult> {
  const data: any = await hfRequest(
    `${HF_API_BASE}/models/${HF_MODEL_TEXT}`,
    {
      inputs: `<s>[INST] Given this meal description: "${description}"

Estimate the nutritional content. Return ONLY a valid JSON object (no markdown, no extra text, no explanation) with these exact keys: total_calories (number), protein_g (number), carbs_g (number), fat_g (number). Use realistic portion sizes. [/INST]`,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.1,
        return_full_text: false,
      },
    },
    30000
  );

  const text =
    data?.[0]?.generated_text ??
    (typeof data === "string" ? data : "");

  return parseNutritionResponse(text);
}

function getFallbackNutrition(): NutritionResult {
  return {
    total_calories: 450,
    protein_g: 28,
    carbs_g: 50,
    fat_g: 15,
  };
}
