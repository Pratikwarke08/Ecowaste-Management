import mongoose from "mongoose";

const marketplaceListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    materialType: { type: String, required: true, trim: true },
    quantityKg: { type: Number, required: true, min: 0 },
    pricePerKg: { type: Number, required: true, min: 0 },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    status: {
      type: String,
      enum: ["open", "reserved", "sold", "cancelled"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

marketplaceListingSchema.index({ materialType: 1, status: 1, createdAt: -1 });

export const MarketplaceListing = mongoose.model("MarketplaceListing", marketplaceListingSchema);
