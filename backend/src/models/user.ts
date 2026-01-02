import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  phone: { type: String },
  address: { type: String },
  bio: { type: String },
  sector: { type: String },
  aadhaarLast4: { type: String },
  photoBase64: { type: String }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["collector", "employee"], default: "collector", index: true },
  profile: { type: profileSchema, default: {} },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  withdrawnPoints: { type: Number, default: 0 },
  lastLoginAt: { type: Date, index: true },
  lastActiveAt: { type: Date, index: true },
  tokenVersion: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model("User", userSchema);


