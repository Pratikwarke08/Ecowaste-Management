import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  { _id: false }
);

const pickupSessionSchema = new mongoose.Schema(
  {
    pickupImageBase64: { type: String, required: true },
    pickupLocation: { type: locationSchema, required: true },
    collectorEmail: { type: String, index: true },
    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    status: {
      type: String,
      enum: ["active", "converted", "expired"],
      default: "active",
      index: true
    },
    linkedReportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report", index: true },
    expiresAt: { type: Date, index: true }
  },
  { timestamps: true }
);

pickupSessionSchema.index({ status: 1, createdAt: -1 });

export const PickupSession = mongoose.model("PickupSession", pickupSessionSchema);
