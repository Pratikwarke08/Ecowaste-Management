import mongoose from "mongoose";

const serviceAreaSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radiusKm: { type: Number, default: 5 },
  },
  { _id: false }
);

const collectorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    vehicle_type: { type: String, required: true, trim: true },
    service_area: { type: serviceAreaSchema, required: true },
    contact: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true, index: true },
  },
  { timestamps: true, collection: "collectors" }
);

export const Collector = mongoose.model("Collector", collectorSchema);
