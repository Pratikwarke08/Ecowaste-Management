import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
  collectorEmail: { type: String, required: true, index: true },
  amountPoints: { type: Number, required: true },
  amountRupees: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["upi", "bank"], default: "upi" },
  paymentDetails: { type: Object, default: {} },
  status: { type: String, enum: ["completed", "pending", "failed"], default: "pending", index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for common query pattern
withdrawalSchema.index({ collectorEmail: 1, createdAt: -1 });

export const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);


