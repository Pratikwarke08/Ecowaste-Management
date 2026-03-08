import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const recyclingJobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    materialType: { type: String, required: true, trim: true },
    quantityKg: { type: Number, required: true, min: 0 },
    pickupLocation: { type: coordinateSchema, required: true },
    dropLocation: { type: coordinateSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "assigned", "in_transit", "delivered"],
      default: "pending",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

recyclingJobSchema.index({ materialType: 1, status: 1, createdAt: -1 });

export const RecyclingJob = mongoose.model("RecyclingJob", recyclingJobSchema);
