import mongoose from "mongoose";

const carbonCreditSchema = new mongoose.Schema(
  {
    waste_upload_id: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true, unique: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    material_type: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0 },
    co2_saved: { type: Number, required: true, min: 0 },
    credits: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: "carbon_credits" }
);

export const CarbonCredit = mongoose.model("CarbonCredit", carbonCreditSchema);
