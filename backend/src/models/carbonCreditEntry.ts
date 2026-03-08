import mongoose from "mongoose";

const carbonCreditEntrySchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ["recycling", "transport_optimization", "waste_diversion", "manual_adjustment"],
      required: true,
      index: true,
    },
    referenceId: { type: String, default: "", trim: true, index: true },
    credits: { type: Number, required: true },
    co2eKg: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

carbonCreditEntrySchema.index({ sourceType: 1, createdAt: -1 });

export const CarbonCreditEntry = mongoose.model("CarbonCreditEntry", carbonCreditEntrySchema);
