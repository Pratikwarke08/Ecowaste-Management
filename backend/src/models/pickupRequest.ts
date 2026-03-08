import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const pickupRequestSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    waste_upload_id: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true, index: true },
    pickup_location: { type: coordinateSchema, required: true },
    assigned_collector: { type: mongoose.Schema.Types.ObjectId, ref: "Collector", index: true },
    status: { type: String, enum: ["pending", "assigned", "completed"], default: "pending", index: true },
    suggested: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: "pickup_requests" }
);

export const PickupRequest = mongoose.model("PickupRequest", pickupRequestSchema);
