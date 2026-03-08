import mongoose from "mongoose";

const wasteListingSchema = new mongoose.Schema(
  {
    waste_upload_id: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true, index: true },
    material_type: { type: String, required: true, trim: true, index: true },
    weight: { type: Number, required: true, min: 0 },
    price_per_kg: { type: Number, required: true, min: 0 },
    seller_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recycler_id: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", index: true },
    status: { type: String, enum: ["available", "sold"], default: "available", index: true },
  },
  { timestamps: true, collection: "waste_listings" }
);

export const WasteListing = mongoose.model("WasteListing", wasteListingSchema);
