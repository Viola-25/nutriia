import mongoose, { Schema, Document } from "mongoose";

export interface IIngredient {
  _id?: mongoose.Types.ObjectId;
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IMeal {
  _id: mongoose.Types.ObjectId;
  items: string;
  ingredients: IIngredient[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: Date;
}

export interface IDailySummary {
  caloriesConsumed: number;
  goalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IMealRecord extends Document {
  clerkId: string;
  date: string;
  meals: IMeal[];
  dailySummary: IDailySummary;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema<IIngredient>({
  name: { type: String, required: true },
  quantity: { type: String, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fat: { type: Number, required: true },
});

const MealSchema = new Schema<IMeal>({
  items: { type: String, required: true },
  ingredients: [IngredientSchema],
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fat: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const DailySummarySchema = new Schema<IDailySummary>(
  {
    caloriesConsumed: { type: Number, default: 0 },
    goalCalories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
  },
  { _id: false }
);

const MealRecordSchema = new Schema<IMealRecord>(
  {
    clerkId: { type: String, required: true },
    date: { type: String, required: true },
    meals: [MealSchema],
    dailySummary: { type: DailySummarySchema, default: () => ({}) },
  },
  { timestamps: true }
);

MealRecordSchema.index({ clerkId: 1, date: 1 }, { unique: true });

export default (mongoose.models.MealRecord as mongoose.Model<IMealRecord>) ||
  mongoose.model<IMealRecord>("MealRecord", MealRecordSchema);
