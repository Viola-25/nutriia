export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

const GOAL_ADJUSTMENTS = {
  deficit: -500,
  maintain: 0,
  surplus: 500,
} as const;

export type Sex = "male" | "female";
export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;
export type GoalType = keyof typeof GOAL_ADJUSTMENTS;

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  sex: Sex
): number {
  return Math.round(10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161));
}

export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel
): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
}

export function calculateGoalCalories(
  tdee: number,
  goalType: GoalType
): number {
  return Math.round(tdee + GOAL_ADJUSTMENTS[goalType]);
}
