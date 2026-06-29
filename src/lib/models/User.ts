import mongoose, { Schema, Document } from "mongoose";
import type { Sex, ActivityLevel, GoalType } from "@/lib/calculations";

export interface IUser extends Document {
  clerkId: string;
  age: number;
  weight: number;
  height: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  bmr: number;
  tdee: number;
  goalCalories: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true },
    age: { type: Number, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    sex: { type: String, enum: ["male", "female"], required: true },
    activityLevel: {
      type: String,
      enum: ["sedentary", "light", "moderate", "active", "very_active"],
      required: true,
    },
    goalType: {
      type: String,
      enum: ["deficit", "maintain", "surplus"],
      default: "maintain",
    },
    bmr: { type: Number },
    tdee: { type: Number },
    goalCalories: { type: Number },
  },
  { timestamps: true }
);

export default (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
